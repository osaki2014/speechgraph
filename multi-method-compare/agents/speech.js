import { getPipeline, runInference } from '../lib/modelHub.js';

export async function whisperAgent(audio, model='onnx-community/whisper-tiny') {
  const { pipe, initMs } = await getPipeline('automatic-speech-recognition', model, { dtype: 'q8' });
  const t0 = performance.now();
  const out = await runInference(() => pipe(audio, { language: 'ja', task: 'transcribe' }));
  return { value: out.text?.trim() || '', initMs, inferMs: performance.now()-t0, model, status:'real' };
}

export async function webSpeechAgent(text) {
  const t0=performance.now();
  return { value:text, initMs:0, inferMs:performance.now()-t0, model:'Web Speech API / shared transcript', status:'real' };
}
