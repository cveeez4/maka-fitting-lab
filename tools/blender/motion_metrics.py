"""Pure metrics shared by the Blender bake and regression tests."""
import math

def free_step_distances(previous,current,indices):
    return [math.sqrt(sum((b-a)**2 for a,b in zip(previous[i],current[i]))) for i in indices]

def summarize_step(distances,frame):
    if not distances or any(not math.isfinite(d) or d<0 for d in distances):raise ValueError('Invalid motion samples')
    values=sorted(distances)
    return {'frame':frame,'freeVertexRmsMeters':math.sqrt(sum(d*d for d in values)/len(values)),'freeVertexP95Meters':values[min(len(values)-1,int(.95*len(values)))],'freeVertexMaxMeters':values[-1]}

def limited_motion_gate(samples):
    return len(samples)==20 and all(s['freeVertexRmsMeters']<.0005 and s['freeVertexMaxMeters']<.003 for s in samples)
