import { ClassConstructor, plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

function validateConfig<T extends object>(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<T>,
) {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMsg = errors
      .map(
        (error) =>
          `\nError in ${error.property}:\n` +
          (error.constraints
            ? Object.entries(error.constraints as Record<string, string>)
                .map(([key, value]) => `+ ${key}: ${value}`)
                .join('\n')
            : 'No constraints'),
      )
      .join('\n');

    console.error(`\n${errors.toString()}`);
    throw new Error(errorMsg);
  }
  return validatedConfig;
}

export default validateConfig;
