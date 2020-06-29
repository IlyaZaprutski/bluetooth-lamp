import { PtsCanvas } from 'react-pts-canvas';
import { Sound, Const, Geom, Num, Curve, Group, Create } from 'pts';
import PropTypes from 'prop-types';

import { getColorByLvl } from './tools';

class SoundCanvas extends PtsCanvas {
  sound;
  bins = 256;
  bufferLoaded = false;
  ctrls = null;
  radius = null;

  static propTypes = {
    onChangeDecibelLvl: PropTypes.func.isRequired,
    color: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    Sound.input().then(s => {
      this.sound = s.analyze(256);
    });
  }

  componentWillUnmount() {
    this.sound.stop();
    this.space.stop();
  }

  getCtrlPoints(t) {
    const r = this.radius + this.radius * (Num.cycle((t % 3000) / 3000) * 0.2);
    const temp = this.ctrls.clone();

    for (let i = 0, len = temp.length; i < len; i += 1) {
      const d = this.ctrls[i].$subtract(this.space.pointer);

      if (d.magnitudeSq() < r * r) {
        // push out if inside threshold
        temp[i].to(this.space.pointer.$add(d.unit().$multiply(r)));
      } else if (!this.ctrls[i].equals(temp[i], 0.1)) {
        // pull in if outside threshold
        temp[i].to(Geom.interpolate(temp[i], this.ctrls[i], 0.02));
      }
    }

    // close the bspline curve with 3 extra points
    temp.push(temp.p1, temp.p2, temp.p3);
    return temp;
  }

  start() {
    this.radius = this.space.size.minValue().value / 3.5;
    this.ctrls = Create.radialPts(this.space.center, this.radius, 10, -Const.pi - Const.quarter_pi);
  }

  // Override PtsCanvas' animate function
  animate(time) {
    if (this.sound && this.sound.playable) {
      // get b-spline curve and draw face shape
      const anchors = this.getCtrlPoints(time);
      const curve = Curve.bspline(anchors, 4);
      const center = anchors.centroid();
      this.form.fillOnly('#123').polygon(curve);

      // initiate spikes array, evenly distributed spikes aroundthe face
      const spikes = [];
      for (let i = 0; i < this.bins; i += 1) {
        spikes.push(curve.interpolate(i / this.bins));
      }

      // calculate spike shapes based on freqs
      const freqs = this.sound.freqDomainTo([this.bins, 1]);

      // const sd = this.sound.freqDomain();
      // const total = sd.reduce((acc, c) => acc + c, 0);
      // const rms = Math.sqrt(total / (sd.length / 2));
      // const decibel = 20 * (Math.log(rms) / Math.log(10));

      const tris = [];
      let tindex = 0;
      let f_acc = 0;

      let temp;
      for (let i = 0, len = freqs.length; i < len; i++) {
        const prev = spikes[i === 0 ? spikes.length - 1 : i - 1];
        const dp = spikes[i].$subtract(prev);
        f_acc += freqs[i].y;

        if (dp.magnitudeSq() < 2) continue;

        if (tindex === 0) {
          temp = [spikes[i]];
        } else if (tindex === 1) {
          const pp = Geom.perpendicular(dp);
          temp.push(spikes[i].$add(pp[1].$unit().multiply(freqs[i].y * this.radius)));
        } else if (tindex === 2) {
          temp.push(spikes[i]);
          tris.push(temp);
        }

        tindex = (i + 1) % 3;
      }

      // draw spikes
      const f_scale = f_acc / this.bins;

      this.props.onChangeDecibelLvl(getColorByLvl(f_acc));

      //  console.log(f_acc);

      for (let i = 0, len = tris.length; i < len; i += 1) {
        this.form.fillOnly('#123').polygon(tris[i]);
        this.form.fillOnly(this.props.color).point(tris[i][1], freqs[i].y * 10, 'circle');
      }

      // draw "lips" based on time domain data
      const tdata = this.sound
        .timeDomainTo([this.radius, 10], [center.x - this.radius / 2, 0])
        .map(
          (t, i) =>
            new Group(
              [t.x, center.y - t.y * Num.cycle(i / this.bins) * (0.5 + 1.5 * f_scale)],
              [t.x, center.y + t.y * Num.cycle(i / this.bins) * (0.5 + 10 * f_scale) + 30],
            ),
        );

      for (let i = 0, len = tdata.length; i < len; i++) {
        const t2 = [tdata[i].interpolate(0.25 + 0.2 * f_scale), tdata[i].interpolate(0.5 + 0.3 * f_scale)];
        this.form.strokeOnly('#f06').line(tdata[i]);
        this.form.strokeOnly('#123', 2).line(t2);
      }

      // draw eyes
      const eyeRight = center.clone().toAngle(-Const.quarter_pi - 0.2, this.radius / 2, true);
      const eyeLeft = center.clone().toAngle(-Const.quarter_pi - Const.half_pi + 0.2, this.radius / 2, true);
      this.form.fillOnly('#fff').ellipse(eyeLeft, [8 + 10 * f_scale, 10 + 8 * f_scale], 0 - 1 * f_scale);
      this.form.fillOnly('#fff').ellipse(eyeRight, [8 + 10 * f_scale, 10 + 8 * f_scale], 0 + 1 * f_scale);

      const eyeBallRight = eyeRight.clone().toAngle(eyeRight.$subtract(this.space.pointer).angle(), -5, true);
      const eyeBallLeft = eyeLeft.clone().toAngle(eyeLeft.$subtract(this.space.pointer).angle(), -5, true);
      this.form.fill('#123').points([eyeBallLeft, eyeBallRight], 2 + 10 * f_scale, 'circle');
    }
  }
}

export default SoundCanvas;
