import { Model } from 'mongoose';
import { IGenericRepository } from 'src/repository/generic-repository.abstract';

export class MongoGenericRepository<T> implements IGenericRepository<T> {
  private _repository: Model<T>;

  private _populateOnFind: string[];

  constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  getAll(): Promise<T[]> {
    return this._repository.find().populate(this._populateOnFind).exec();
  }

  get(id: string): Promise<T> {
    return this._repository.findById(id).populate(this._populateOnFind).exec();
  }

  getByAny(obj: T): Promise<T[]> {
    return this._repository.find(obj, null, { lean: true }).populate(this._populateOnFind).exec();
  }

  create(item: T): Promise<T> {
    return this._repository.create(item);
  }

  update(id: string, item: T) {
    return this._repository.findByIdAndUpdate(id, item).exec();
  }

  updateOneByAny(obj: T, item: T) {
    return this._repository.updateOne(obj, item).exec();
  }

  delete(obj: T) {
    return this._repository.findOneAndDelete(obj).exec();
  }
}