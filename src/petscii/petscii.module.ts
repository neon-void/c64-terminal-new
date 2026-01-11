import { Module, Global } from '@nestjs/common';
import { PetsciiService } from './petscii.service';

@Global()
@Module({
  providers: [PetsciiService],
  exports: [PetsciiService],
})
export class PetsciiModule {}
