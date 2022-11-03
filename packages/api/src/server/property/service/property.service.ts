import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/configuration/logger/logger.service';
import { IDataServices } from 'src/repository/data-services.abstract';
import { Property } from 'src/repository/mongo/model';
import { ExceptionsService } from 'src/server/exceptions/exceptions.service';
import { CreatePropertyDto } from 'src/server/property/property.dto';
import { DeploymentRecord } from '../property.entity';
import { PropertyResponseDto } from '../property.response.dto';
import { PropertyFactory } from './property.factory';

@Injectable()
export class PropertyService {
  constructor(
    private dataServices: IDataServices,
    private propertyFactoryService: PropertyFactory,
    private loggerService: LoggerService,
    private exceptionService: ExceptionsService
  ) {}

  getAllProperties(): Promise<Property[]> {
    return this.dataServices.property.getAll();
  }

  async getPropertyDetails(propertyIdentifier: string): Promise<PropertyResponseDto> {
    const propertyResponse = (await this.dataServices.property.getByAny({ identifier: propertyIdentifier }))[0];
    const environmentResponse = await this.dataServices.environment.getByAny({ propertyIdentifier });
    const response = new PropertyResponseDto();
    response.title = propertyResponse.title;
    response.identifier = propertyResponse.identifier;
    response.createdBy = propertyResponse.createdBy;
    response.env = environmentResponse;
    return response;
  }

  async createProperty(createPropertyDto: CreatePropertyDto): Promise<PropertyResponseDto> {
    const checkProperty = await this.dataServices.property.getByAny({
      identifier: createPropertyDto.identifier
    });
    if (checkProperty.length > 0) this.exceptionService.badRequestException({ message: 'Property already exist.' });
    const deploymentRecord = await this.getDeploymentRecord(createPropertyDto);
    const property = this.propertyFactoryService.createNewProperty(createPropertyDto, deploymentRecord);
    const environment = this.propertyFactoryService.createNewEnvironment(createPropertyDto);
    await Promise.all([this.dataServices.property.create(property), this.dataServices.environment.create(environment)]);
    await this.propertyFactoryService.initializeEnvironment(property, environment);
    return this.getPropertyDetails(createPropertyDto.identifier);
  }

  async createEnvironment(createPropertyDto: CreatePropertyDto): Promise<PropertyResponseDto> {
    const checkPropertyAndEnv = await this.dataServices.environment.getByAny({
      propertyIdentifier: createPropertyDto.identifier,
      env: createPropertyDto.env
    });
    const property = (await this.dataServices.property.getByAny({ identifier: createPropertyDto.identifier }))[0];
    if (checkPropertyAndEnv.length > 0) this.exceptionService.badRequestException({ message: 'Property & Environment already exist.' });
    if (!property) this.exceptionService.badRequestException({ message: 'Please create the Property first.' });
    const checkDeploymentRecord = property.deploymentRecord.find((data) => data.cluster === createPropertyDto.cluster);
    if (!checkDeploymentRecord) {
      const getDeploymentRecord = await this.getDeploymentRecord(createPropertyDto);
      property.deploymentRecord = [...property.deploymentRecord, getDeploymentRecord];
      await this.dataServices.property.updateOneByAny({ identifier: createPropertyDto.identifier }, property);
    }
    this.loggerService.log('Property', JSON.stringify(property));
    const environment = this.propertyFactoryService.createNewEnvironment(createPropertyDto);
    Promise.all([this.dataServices.environment.create(environment)]);
    await this.propertyFactoryService.initializeEnvironment(property, environment);
    return this.getPropertyDetails(createPropertyDto.identifier);
  }

  async getDeploymentRecord(createPropertyDto: CreatePropertyDto) {
    const deploymentConnection = await this.dataServices.deploymentConnection.getByAny({
      cluster: createPropertyDto.cluster
    });
    const deploymentRecord = new DeploymentRecord();
    if (deploymentConnection.length === 1) {
      deploymentRecord.name = deploymentConnection[0].name;
      deploymentRecord.cluster = createPropertyDto.cluster;
    } else {
      deploymentConnection.sort((a, b) => a.weight - b.weight);
      const nextDeploymentConnection = deploymentConnection[0];
      nextDeploymentConnection.weight += 1;
      this.loggerService.log('NextDeploymentConnection', JSON.stringify(nextDeploymentConnection));
      deploymentRecord.name = deploymentConnection[0].name;
      deploymentRecord.cluster = createPropertyDto.cluster;
      await this.dataServices.deploymentConnection.updateOneByAny({ name: nextDeploymentConnection.name }, nextDeploymentConnection);
    }
    this.loggerService.log('DeploymentRecord', JSON.stringify(deploymentRecord));
    return deploymentRecord;
  }
}
