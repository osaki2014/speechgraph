let landmarker=null, initPromise=null;
export async function movementAgent(videoEl){
  if(!videoEl) return {value:{activity:0,available:false},initMs:0,inferMs:0,model:'MediaPipe Pose Landmarker',status:'fallback'};
  let initMs=0;
  try{
    if(!landmarker){
      if(!initPromise) initPromise=(async()=>{const t0=performance.now(); const mp=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm'); const files=await mp.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'); landmarker=await mp.PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1}); return performance.now()-t0;})();
      initMs=await initPromise;
    }
    const t0=performance.now(); const res=landmarker.detectForVideo(videoEl,performance.now());
    const lm=res.landmarks?.[0]||[]; let activity=0;
    if(lm.length) activity=Math.min(1, Math.abs((lm[15]?.y||0)-(lm[16]?.y||0))*2 + Math.abs((lm[11]?.y||0)-(lm[12]?.y||0)));
    return {value:{activity,available:true},initMs,inferMs:performance.now()-t0,model:'MediaPipe Pose Landmarker Lite',status:'real'};
  }catch(e){return{value:{activity:0,available:false},initMs,inferMs:0,model:'MediaPipe Pose Landmarker',status:'fallback',error:String(e)}}
}
