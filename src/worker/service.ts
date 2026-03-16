import express, {Express, Request, Response} from 'express';
import {create} from "xmlbuilder2";
import axios from "axios";
import {parseXML} from "../utils";
import WorkModel, {CrackResult} from "./model";


export default class Worker {
  private app: Express;
  private readonly managerUrl: string;
  private model: WorkModel;

  constructor(workModel: WorkModel, managerUrl: string) {
    this.model = workModel;
    this.model.addObserver(this.sendToManager);
    this.app = express();
    this.app.use(express.text({ type: 'application/xml' }));
    this.managerUrl = managerUrl;
  }

  private start = (req: Request, res: Response): void => {
    const crackRequest = parseXML(req.body).CrackRequest;
    this.model.startCrack({
      id: crackRequest.RequestId,
      hash: crackRequest.Hash,
      maxLength: crackRequest.MaxLength,
      partCount: crackRequest.PartCount,
      partNumber: crackRequest.PartNumber,
      alphabet: crackRequest.Alphabet.symbols,
    })

    res.status(200).send('OK');
  }


  private sendToManager = async (event: string, payload: CrackResult) => {
    if (event !== 'ready') {
      return;
    }
    const xmlString = this.convertToXML(payload);
    await axios.patch(this.managerUrl + '/internal/api/manager/hash/crack/request', xmlString, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
  }

  private convertToXML(payload: CrackResult) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CrackHashWorkerResponse')
      .ele('RequestId').txt(payload.id).up()
      .ele('PartNumber').txt(String(payload.partNumber)).up()
      .ele('Answers');

    payload.words.forEach(word => {
      doc.ele('words').txt(word).up();
    });

    return doc.doc().end({prettyPrint: true});
  }

  public init(): void {
    this.app.post("/internal/api/worker/hash/crack/task", this.start);
    this.app.delete("/internal/api/worker/hash/crack/task", () => this.model.terminate());
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  }
}
