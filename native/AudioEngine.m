#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>
#import <MediaPlayer/MediaPlayer.h>

@interface AudioEngine : NSObject <AVAudioPlayerDelegate>
@property(nonatomic,strong) AVAudioPlayer *player;
@property(nonatomic,strong) AVAudioPlayer *nextPlayer;
@property(nonatomic,strong) NSDictionary *metadata;
@property(nonatomic,strong) NSDictionary *nextMetadata;
@property(nonatomic) double transitionAt, nextStart, fadeDuration;
@property(nonatomic) float nextGain;
@property(nonatomic) BOOL transitioning;
@property(nonatomic) NSUInteger transitionGeneration;
@end

@implementation AudioEngine

- (instancetype)init {
  self = [super init];
  if (self) {
    self.fadeDuration = 5;
    [self configureRemoteCommands];
    [NSTimer scheduledTimerWithTimeInterval:.1 target:self selector:@selector(tick) userInfo:nil repeats:YES];
  }
  return self;
}

- (void)emit:(NSDictionary *)payload {
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
  fwrite(data.bytes, 1, data.length, stdout);
  fwrite("\n", 1, 1, stdout);
  fflush(stdout);
}

- (void)emitRemoteCommand:(NSString *)command extra:(NSDictionary *)extra {
  NSMutableDictionary *payload = [@{ @"event": @"remoteCommand", @"command": command } mutableCopy];
  if (extra) [payload addEntriesFromDictionary:extra];
  [self emit:payload];
}

- (void)configureRemoteCommands {
  MPRemoteCommandCenter *commands = [MPRemoteCommandCenter sharedCommandCenter];
  commands.playCommand.enabled = YES;
  commands.pauseCommand.enabled = YES;
  commands.togglePlayPauseCommand.enabled = YES;
  commands.nextTrackCommand.enabled = YES;
  commands.previousTrackCommand.enabled = YES;
  commands.changePlaybackPositionCommand.enabled = YES;

  [commands.playCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    [self emitRemoteCommand:@"play" extra:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [commands.pauseCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    [self emitRemoteCommand:@"pause" extra:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [commands.togglePlayPauseCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    [self emitRemoteCommand:@"togglePlayPause" extra:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [commands.nextTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    [self emitRemoteCommand:@"next" extra:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [commands.previousTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    [self emitRemoteCommand:@"previous" extra:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [commands.changePlaybackPositionCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *event) {
    MPChangePlaybackPositionCommandEvent *positionEvent = (MPChangePlaybackPositionCommandEvent *)event;
    [self emitRemoteCommand:@"seek" extra:@{ @"time": @(positionEvent.positionTime) }];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
}

- (NSImage *)artworkImage:(NSString *)dataURL {
  if (![dataURL isKindOfClass:NSString.class]) return nil;
  NSRange comma = [dataURL rangeOfString:@","];
  if (comma.location == NSNotFound) return nil;
  NSData *data = [[NSData alloc] initWithBase64EncodedString:[dataURL substringFromIndex:comma.location + 1]
                                                     options:NSDataBase64DecodingIgnoreUnknownCharacters];
  return data ? [[NSImage alloc] initWithData:data] : nil;
}

- (void)publishNowPlayingAt:(double)elapsed duration:(double)duration playing:(BOOL)playing {
  if (!self.metadata) return;
  NSMutableDictionary *info = [NSMutableDictionary dictionary];
  NSString *title = self.metadata[@"title"];
  NSString *artist = self.metadata[@"artist"];
  NSString *album = self.metadata[@"album"];
  if (title) info[MPMediaItemPropertyTitle] = title;
  if (artist) info[MPMediaItemPropertyArtist] = artist;
  if (album) info[MPMediaItemPropertyAlbumTitle] = album;
  info[MPMediaItemPropertyPlaybackDuration] = @(duration);
  info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = @(elapsed);
  info[MPNowPlayingInfoPropertyPlaybackRate] = @(playing ? 1.0 : 0.0);
  info[MPNowPlayingInfoPropertyMediaType] = @(MPNowPlayingInfoMediaTypeAudio);
  if (self.metadata[@"queueIndex"]) info[MPNowPlayingInfoPropertyPlaybackQueueIndex] = self.metadata[@"queueIndex"];
  if (self.metadata[@"queueCount"]) info[MPNowPlayingInfoPropertyPlaybackQueueCount] = self.metadata[@"queueCount"];

  NSImage *image = [self artworkImage:self.metadata[@"cover"]];
  if (image) {
    MPMediaItemArtwork *artwork = [[MPMediaItemArtwork alloc] initWithBoundsSize:image.size requestHandler:^NSImage *(CGSize size) {
      return image;
    }];
    info[MPMediaItemPropertyArtwork] = artwork;
  }

  MPNowPlayingInfoCenter *center = [MPNowPlayingInfoCenter defaultCenter];
  center.nowPlayingInfo = info;
  center.playbackState = playing ? MPNowPlayingPlaybackStatePlaying : MPNowPlayingPlaybackStatePaused;
}

- (void)clearNowPlaying {
  MPNowPlayingInfoCenter *center = [MPNowPlayingInfoCenter defaultCenter];
  center.playbackState = MPNowPlayingPlaybackStateStopped;
  center.nowPlayingInfo = nil;
}

- (void)emitState {
  if (self.player) [self emit:@{ @"event": @"state", @"playing": @(self.player.isPlaying), @"currentTime": @(self.player.currentTime), @"duration": @(self.player.duration) }];
}

- (AVAudioPlayer *)makePlayer:(NSString *)path error:(NSError **)error {
  AVAudioPlayer *player = [[AVAudioPlayer alloc] initWithContentsOfURL:[NSURL fileURLWithPath:path] error:error];
  player.delegate = self;
  player.volume = 1;
  [player prepareToPlay];
  return player;
}

- (void)load:(NSDictionary *)command {
  self.transitionGeneration += 1;
  [self.player stop]; [self.nextPlayer stop];
  self.nextPlayer = nil; self.nextMetadata = nil; self.transitioning = NO;
  self.metadata = command[@"metadata"];
  NSError *error = nil;
  self.player = [self makePlayer:command[@"path"] error:&error];
  if (error) { [self emit:@{ @"event": @"error", @"message": error.localizedDescription }]; return; }
  [self publishNowPlayingAt:0 duration:self.player.duration playing:NO];
  [self emitState];
}

- (void)prepareNext:(NSDictionary *)command {
  NSError *error = nil;
  self.nextPlayer = [self makePlayer:command[@"path"] error:&error];
  if (error) { [self emit:@{ @"event": @"error", @"message": error.localizedDescription }]; return; }
  self.nextMetadata = command[@"metadata"];
  self.nextStart = [command[@"nextStart"] doubleValue];
  self.fadeDuration = MAX(2, MIN(10, [command[@"fadeDuration"] doubleValue]));
  self.transitionAt = MAX(0, [command[@"currentEnd"] doubleValue] - self.fadeDuration);
  self.nextGain = MAX(.55, MIN(1, [command[@"nextGain"] floatValue]));
  [self emit:@{ @"event": @"prepared", @"transitionAt": @(self.transitionAt), @"nextStart": @(self.nextStart) }];
}

- (void)tick {
  if (self.player.isPlaying && self.nextPlayer && !self.transitioning && self.player.currentTime >= self.transitionAt) {
    self.transitioning = YES;
    [self emit:@{ @"event": @"crossfadeStarted", @"duration": @(self.fadeDuration) }];
    self.nextPlayer.currentTime = self.nextStart;
    self.nextPlayer.volume = 0;
    [self.nextPlayer play];
    [self.player setVolume:0 fadeDuration:self.fadeDuration];
    [self.nextPlayer setVolume:self.nextGain fadeDuration:self.fadeDuration];
    NSUInteger generation = self.transitionGeneration;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(self.fadeDuration * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      if (generation != self.transitionGeneration || !self.transitioning || !self.nextPlayer) return;
      [self.player stop];
      self.player = self.nextPlayer;
      self.player.volume = 1;
      self.nextPlayer = nil;
      self.metadata = self.nextMetadata;
      self.nextMetadata = nil;
      self.transitioning = NO;
      [self publishNowPlayingAt:self.player.currentTime duration:self.player.duration playing:YES];
      [self emit:@{ @"event": @"transitioned" }];
      [self emitState];
    });
  }
  [self emitState];
}

- (void)handle:(NSDictionary *)command {
  NSString *action = command[@"action"];
  if ([action isEqualToString:@"load"]) { [self load:command]; return; }
  if ([action isEqualToString:@"prepareNext"]) { [self prepareNext:command]; return; }
  if ([action isEqualToString:@"cancelNext"]) { self.transitionGeneration += 1; self.player.volume = 1; [self.nextPlayer stop]; self.nextPlayer = nil; self.nextMetadata = nil; self.transitioning = NO; return; }
  if ([action isEqualToString:@"play"]) {
    [self.player play];
    [self publishNowPlayingAt:self.player.currentTime duration:self.player.duration playing:YES];
  } else if ([action isEqualToString:@"pause"]) {
    [self.player pause]; [self.nextPlayer pause];
    [self publishNowPlayingAt:self.player.currentTime duration:self.player.duration playing:NO];
  } else if ([action isEqualToString:@"stop"]) {
    self.transitionGeneration += 1;
    self.player.volume = 1;
    [self.player stop]; self.player.currentTime = 0; [self.player prepareToPlay];
    [self.nextPlayer stop]; self.nextPlayer = nil; self.nextMetadata = nil; self.transitioning = NO;
    [self publishNowPlayingAt:0 duration:self.player.duration playing:NO];
  } else if ([action isEqualToString:@"seek"]) {
    self.player.currentTime = MAX(0, MIN([command[@"time"] doubleValue], self.player.duration));
    [self publishNowPlayingAt:self.player.currentTime duration:self.player.duration playing:self.player.isPlaying];
  } else if ([action isEqualToString:@"clearNowPlaying"]) {
    [self clearNowPlaying];
  }
  [self emitState];
}

- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)finished {
  if (player == self.player && !self.transitioning) { [self emit:@{ @"event": @"ended" }]; [self emitState]; }
}

@end

int main(void) {
  @autoreleasepool {
    AudioEngine *engine = [AudioEngine new];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      char *buffer = NULL;
      size_t capacity = 0;
      while (getline(&buffer, &capacity, stdin) != -1) {
        @autoreleasepool {
          NSData *data = [NSData dataWithBytes:buffer length:strlen(buffer)];
          NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
          if ([json isKindOfClass:NSDictionary.class]) dispatch_async(dispatch_get_main_queue(), ^{ [engine handle:json]; });
        }
      }
      free(buffer);
      exit(0);
    });
    [[NSRunLoop mainRunLoop] run];
  }
  return 0;
}
