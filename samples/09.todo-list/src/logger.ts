export function Logger(): MethodDecorator {
  return  (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value as Function;
  
    Object.defineProperty(descriptor, 'value', {
      value: function (...args: any[]) {
        console.log(`\x1b[2mFunction: ${originalMethod.toString()})\x1b[0m`);
        console.log(`\x1b[2mParameters: ${JSON.stringify(args)}\x1b[0m`);
  
        const res = originalMethod.apply(this, args);
  
        console.log(`\x1b[2mReturn: ${JSON.stringify(res)}\x1b[0m`);
  
        return res;
      },
    });
  
    return descriptor;
  }
}
