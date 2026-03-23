import TasksModel from "./tasks-model";
import Service from "./service";
import {config} from "../config";

const workerUrls = config.manager.workerUrls;

const model = new TasksModel(workerUrls.length);
const service = new Service(model, workerUrls);
service.init();
