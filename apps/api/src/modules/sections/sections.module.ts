import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Section, SectionProduct } from '../../entities';
import { SectionsService } from './sections.service';
import { SectionsPublicController, SectionsAdminController } from './sections.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Section, SectionProduct])],
  controllers: [SectionsPublicController, SectionsAdminController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
