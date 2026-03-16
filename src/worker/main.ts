import WorkModel from "./model";
import Service from "../worker/service";

const managerUrl = process.env.MANAGER_URL;
if (!managerUrl ) throw new Error('MANAGER_URL not set');


const model = new WorkModel();
const service = new Service(model, managerUrl.trim());
service.init();
