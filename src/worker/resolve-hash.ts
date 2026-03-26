import { parentPort, workerData } from 'worker_threads';
import {permutations} from "../utils";
import {WorkerRequest} from "./model";
const md5 = require('md5');


const request = workerData as WorkerRequest;


function doCrack() {
  if (!request) {
    return;
  }
  const baseSize = Math.floor(request.alphabet.length / request.partCount);
  const remainder = request.alphabet.length % request.partCount;
  const chunkSize = baseSize + (request.partNumber <= remainder ? 1 : 0);

  let startIndex = 0;
  for (let i = 1; i < request.partNumber; i++) {
    startIndex += baseSize + (i <= remainder ? 1 : 0);
  }
  const prefixes = request.alphabet.slice(startIndex, startIndex + chunkSize);
  const words: string[] = [];
  for (let i = 0; i < request.maxLength; i++) {

    for (const prefix of prefixes) {
      if (md5(prefix) === request.hash) {
        words.push(prefix);
      }
      const iterator = permutations(request.alphabet, i);

      for (const item of iterator) {

        const word = prefix + item.join('');
        if (md5(word) == request.hash) {
          words.push(word);
        }
      }
    }
  }
  parentPort?.postMessage({
    type: 'ready',
    id: request.id,
    words,
    partNumber: request.partNumber,
  });
}

doCrack();
