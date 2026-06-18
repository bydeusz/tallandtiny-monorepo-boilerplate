import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateMiniDto } from './dto/create-mini.dto';
import { UpdateMiniDto } from './dto/update-mini.dto';
import { Mini } from './entities/mini.entity';
import { MinisService } from './minis.service';

@ApiTags('minis')
@Controller('minis')
export class MinisController {
  constructor(private readonly minisService: MinisService) {}

  @Get()
  @ApiOkResponse({ type: [Mini] })
  getMinis() {
    return this.minisService.getMinis();
  }

  @Get(':id')
  @ApiOkResponse({ type: Mini })
  getMini(@Param('id') id: string) {
    return this.minisService.getMini(id);
  }

  @Post()
  @ApiCreatedResponse({ type: Mini })
  createMini(@Body() createMiniDto: CreateMiniDto) {
    return this.minisService.createMini(createMiniDto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Mini })
  updateMini(@Param('id') id: string, @Body() updateMiniDto: UpdateMiniDto) {
    return this.minisService.updateMini(id, updateMiniDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Mini })
  deleteMini(@Param('id') id: string) {
    return this.minisService.deleteMini(id);
  }
}
