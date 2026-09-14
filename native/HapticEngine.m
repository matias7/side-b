#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>

static NSHapticFeedbackPattern patternForName(NSString *name) {
  if ([name isEqualToString:@"hover"]) return NSHapticFeedbackPatternAlignment;
  if ([name isEqualToString:@"levelChange"]) return NSHapticFeedbackPatternLevelChange;
  return NSHapticFeedbackPatternGeneric;
}

int main(void) {
  @autoreleasepool {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0), ^{
      char *buffer = NULL;
      size_t capacity = 0;
      while (getline(&buffer, &capacity, stdin) != -1) {
        @autoreleasepool {
          NSData *data = [NSData dataWithBytes:buffer length:strlen(buffer)];
          NSDictionary *command = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
          NSString *pattern = [command isKindOfClass:NSDictionary.class] ? command[@"pattern"] : nil;
          if (![pattern isKindOfClass:NSString.class]) continue;
          dispatch_async(dispatch_get_main_queue(), ^{
            [[NSHapticFeedbackManager defaultPerformer]
              performFeedbackPattern:patternForName(pattern)
              performanceTime:NSHapticFeedbackPerformanceTimeNow];
          });
        }
      }
      free(buffer);
      exit(0);
    });
    [[NSRunLoop mainRunLoop] run];
  }
  return 0;
}
