import { Transform } from 'class-transformer';
import {
  buildMessage,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateBy,
} from 'class-validator';

/** bcrypt only uses the first 72 bytes, so reject longer UTF-8 input instead of silently truncating. */
function MaxBytes(max: number) {
  return ValidateBy({
    name: 'maxBytes',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
      defaultMessage: buildMessage((eachPrefix) => `${eachPrefix}$property must be at most ${max} bytes`),
    },
  });
}

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(8, 72)
  @MaxBytes(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
