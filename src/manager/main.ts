import TasksModel from "./tasks-model";
import Service from "./service";

const urls = process.env.WORKER_URLS;
if (!urls) throw new Error('WORKER_URLS not set');
const workerUrls = urls.split(',').map(url => url.trim());

const model = new TasksModel(workerUrls.length);
const service = new Service(model, workerUrls);
service.init();
