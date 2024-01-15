import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from 'src/server/auth/guard';
import { Application } from '../application/entity';
import { LighthouseRequestDTO, LighthouseResponseDTO } from './dto';
import { LighthouseService } from './service';

@Controller('lighthouse')
@ApiTags('Lighthouse')
@UseGuards(AuthenticationGuard)
export class LighthouseController {
  constructor(private readonly lighthouseService: LighthouseService) {}

  @Post('/register/:propertyIdentifier')
  @ApiOperation({ description: 'Get the Build, Deployment & Pod logs.' })
  async registerLighthouse(@Param('propertyIdentifier') propertyIdentifier: string) {
    return this.lighthouseService.registerLighthouse(propertyIdentifier);
  }

  @Post('/generate')
  @ApiOperation({ description: 'Genrate the Lighthouse Report.' })
  async generateLighthouseReport(@Body() lighthouseRequestDTO: LighthouseRequestDTO): Promise<Application> {
    return this.lighthouseService.generateLighthouseReport(
      lighthouseRequestDTO.propertyIdentifier,
      lighthouseRequestDTO.env,
      lighthouseRequestDTO.identifier,
      lighthouseRequestDTO.isContainerized,
      lighthouseRequestDTO.isGit,
      lighthouseRequestDTO.createdBy
    );
  }

  @Post('/auto-generate')
  @ApiOperation({ description: 'Enable/Disable auto genration of the Lighthouse Report.' })
  async autoGenerateLighthouseReport(@Body() lighthouseRequestDTO: LighthouseRequestDTO): Promise<Application> {
    return this.lighthouseService.autoGenerateLighthouseReport(
      lighthouseRequestDTO.propertyIdentifier,
      lighthouseRequestDTO.env,
      lighthouseRequestDTO.identifier,
      lighthouseRequestDTO.isContainerized,
      lighthouseRequestDTO.isGit,
      lighthouseRequestDTO.autoGenerateLHReport,
      lighthouseRequestDTO.createdBy
    );
  }

  @Get('/:propertyIdentifier/:env/:identifier/:lhIdentifier')
  @ApiOperation({ description: 'Get the Lighthouse Report.' })
  @ApiCreatedResponse({ status: 201, description: 'Lighthouse Report Generated successfully.', type: LighthouseResponseDTO })
  async getLighthouseReports(
    @Param('propertyIdentifier') propertyIdentifier: string,
    @Param('env') env: string,
    @Param('identifier') identifier: string,
    @Param('lhIdentifier') lhIdentifier: string,
    @Query('lhBuildId') lhBuildId: string,
    @Query('isContainerized ') isContainerized: string,
    @Query('isGit') isGit: string,
    @Query('skip') skip: string
  ): Promise<LighthouseResponseDTO[]> {
    return this.lighthouseService.getlighthouseReport(propertyIdentifier, env, identifier, lhBuildId, lhIdentifier, skip, isContainerized, isGit);
  }
}
