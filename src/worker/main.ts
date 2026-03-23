import WorkModel from "./model";
import Service from "../worker/service";
import {config} from "../config";


const model = new WorkModel();
const service = new Service(model, config.worker.managerUrl);
service.init();
