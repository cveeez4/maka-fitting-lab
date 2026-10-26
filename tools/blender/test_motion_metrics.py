import unittest
from motion_metrics import free_step_distances,summarize_step,limited_motion_gate
class MotionTests(unittest.TestCase):
    def test_oscillation_not_hidden_by_equal_endpoints(self):
        positions=[[[0,0,0]],[[.1,0,0]],[[0,0,0]]]
        steps=[summarize_step(free_step_distances(a,b,[0]),i) for i,(a,b) in enumerate(zip(positions,positions[1:]))]
        self.assertEqual(positions[0],positions[-1]);self.assertTrue(all(x['freeVertexRmsMeters']==.1 for x in steps));self.assertFalse(limited_motion_gate(steps))
    def test_pins_do_not_dilute_free_motion(self):
        d=free_step_distances([[0,0,0],[0,0,0]],[[0,0,0],[.01,0,0]],[1]);self.assertEqual(summarize_step(d,1)['freeVertexRmsMeters'],.01)
    def test_requires_full_window_and_maximum_gate(self):
        good=[summarize_step([.0001],i) for i in range(20)];self.assertTrue(limited_motion_gate(good));self.assertFalse(limited_motion_gate(good[:19]));good[-1]=summarize_step([.004],20);self.assertFalse(limited_motion_gate(good))
    def test_nonfinite_samples_rejected(self):
        with self.assertRaises(ValueError):summarize_step([float('nan')],1)
if __name__=='__main__':unittest.main()
