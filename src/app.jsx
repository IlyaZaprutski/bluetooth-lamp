import React from 'react';

import { ChromePicker } from 'react-color';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import * as faceapi from 'face-api.js';

import LightBulb from './light-bulb';
import SoundBox from './sound';

import recognition from './speech-recognition';

import { getColorData, getColor, getRandomRgb } from './tools';

import {
  POWER_ON_DATA,
  POWER_OFF_DATA,
  DEFAULT_COLOR,
  COLORS_MAP,
  EMOTION_COLORS,
  EMOTION_EMOJI,
  APP_MODE,
} from './constants';

import './app.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.videoRef = React.createRef();
    this.emotionRef = React.createRef();

    this.randomColorIntervalId = null;
    this.emotionIntervalId = null;
    this.tracks = [];

    recognition.onspeechend = () => {
      recognition.stop();

      this.setState({
        appModel: APP_MODE.DEFAULT,
        isSpeechRecognition: false,
      });
    };

    recognition.onnomatch = () => {
      console.log("I didn't recognise that color.");

      this.setState({
        appModel: APP_MODE.DEFAULT,
        isSpeechRecognition: false,
      });
    };

    recognition.onerror = event => {
      console.log(`Error occurred in recognition: ${event.error}`);

      this.setState({
        appModel: APP_MODE.DEFAULT,
        isSpeechRecognition: false,
      });
    };

    recognition.onresult = event => {
      const last = event.results.length - 1;
      const color = event.results[last][0].transcript.replace(/ё/g, 'е');

      if (COLORS_MAP.has(color)) {
        this.changeColor(COLORS_MAP.get(color));
      } else {
        toast('😢😢😢 Incorrect color!');
      }

      this.setState({
        appModel: APP_MODE.DEFAULT,
        isSpeechRecognition: false,
      });

      console.log(`Result received: ${color}.`);
      console.log(`Confidence: ${event.results[0][0].confidence}`);
    };
  }

  state = {
    color: getColor(DEFAULT_COLOR),
    isConnected: false,
    isOn: true,
    emotion: null,
    appModel: APP_MODE.DEFAULT,
    isSpeechRecognition: false,
    isTestMode: false,
  };

  onTestMode = () => {
    this.setState({
      isTestMode: true,
      isConnected: true,
    });
  };

  sendCommand = async data => {
    if (!this.state.isTestMode) {
      await this.characteristic.writeValue(data);
    }
  };

  onPair = async () => {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          namePrefix: ['Triones'],
        },
      ],
      optionalServices: ['0000ffd5-0000-1000-8000-00805f9b34fb', '0000ffd0-0000-1000-8000-00805f9b34fb'],
    });

    device.addEventListener('gattserverdisconnected', () => {
      this.setState({ isConnected: false });
    });

    const server = await device.gatt.connect();

    const service = await server.getPrimaryService('0000ffd5-0000-1000-8000-00805f9b34fb');

    const characteristic = await service.getCharacteristic('0000ffd9-0000-1000-8000-00805f9b34fb');

    this.characteristic = characteristic;

    this.setState({ isConnected: true });

    await this.sendCommand(getColorData(DEFAULT_COLOR));
  };

  changeColor = async rgbColor => {
    this.setState({ color: getColor(rgbColor) });

    await this.sendCommand(getColorData(rgbColor));
  };

  handleChangeComplete = color => this.changeColor(color.rgb);

  onPowerToggle = async () => {
    const commandData = this.state.isOn ? POWER_OFF_DATA : POWER_ON_DATA;

    await this.sendCommand(commandData);

    this.setState({
      isOn: !this.state.isOn,
    });
  };

  onRandomGenerate = () => {
    this.setState({
      appModel: APP_MODE.RANDOM_COLOR,
    });

    this.randomColorIntervalId = setInterval(async () => {
      const color = getRandomRgb();

      this.setState({ color: getColor(color) });

      await this.sendCommand(getColorData(color));
    }, 1000);
  };

  onStopRandomGenerate = () => {
    clearInterval(this.randomColorIntervalId);

    this.setState({
      appModel: APP_MODE.DEFAULT,
    });
  };

  onSpeechDetect = () => {
    if (this.state.isSpeechRecognition) {
      return;
    }

    this.setState({
      appModel: APP_MODE.SPEECH,
      isSpeechRecognition: true,
    });

    recognition.start();
  };

  onEmotionDetect = async () => {
    this.setState({
      appModel: APP_MODE.EMOTION,
    });

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    ]);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    const video = this.videoRef.current;
    video.srcObject = stream;

    this.tracks = stream.getTracks();

    video.addEventListener('play', () => {
      const canvas = faceapi.createCanvasFromMedia(video);

      this.emotionRef.current.append(canvas);

      const displaySize = { width: video.clientWidth, height: video.clientHeight };
      faceapi.matchDimensions(canvas, displaySize);

      this.emotionIntervalId = setInterval(async () => {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detection) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections, 0.05);

          const emotion = Object.keys(detection.expressions).reduce((a, b) =>
            detection.expressions[a] > detection.expressions[b] ? a : b,
          );

          if (this.state.emotion !== emotion) {
            this.changeColor(EMOTION_COLORS[emotion]);

            this.setState({
              emotion,
            });
          }

          console.log(emotion);
        }
      }, 500);
    });
  };

  onStopEmotionDetect = () => {
    clearInterval(this.randomColorIntervalId);

    this.setState({
      appModel: APP_MODE.DEFAULT,
    });

    this.emotionRef.current.querySelector('canvas').remove();

    this.tracks.forEach(track => {
      track.stop();
    });

    this.videoRef.current.srcObject = null;
  };

  onSoundDetect = () => {
    this.setState({
      appModel: APP_MODE.SOUND_BOX,
    });
  };

  onStopSoundDetect = () => {
    this.setState({
      appModel: APP_MODE.DEFAULT,
    });
  };

  render() {
    return (
      <div className="app-container">
        <ToastContainer
          position="top-left"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnVisibilityChange
          draggable
          pauseOnHover
          transition={Zoom}
        />

        {!this.state.isConnected && (
          <>
            <button className="pair" onClick={this.onPair}>
              Connect
            </button>

            <button className="pair" onClick={this.onTestMode}>
              Test Mode
            </button>
          </>
        )}

        {this.state.isConnected && (
          <>
            <div className="picker-container" style={{ backgroundColor: this.state.color }}>
              <div className="picker">
                <ChromePicker color={this.state.color} onChangeComplete={this.handleChangeComplete} disableAlpha />
              </div>

              <div className="btn-container">
                <Toggle id="power-status" defaultChecked={this.state.isOn} onChange={this.onPowerToggle} />
                <label className="toggle-label" htmlFor="power-status">{`Turn ${
                  this.state.isOn ? 'Off' : 'On'
                }`}</label>
              </div>

              <div className="btn-container">
                {this.state.appModel === APP_MODE.RANDOM_COLOR ? (
                  <div className="btn" onClick={this.onStopRandomGenerate}>
                    Stop{' '}
                    <span role="img" aria-label="stop">
                      🛑
                    </span>
                  </div>
                ) : (
                  <div className="btn" onClick={this.onRandomGenerate}>
                    Generate Random{' '}
                    <span role="img" aria-label="random">
                      🔀
                    </span>
                  </div>
                )}
              </div>
              <div className="btn-container">
                {this.state.appModel === APP_MODE.SOUND_BOX ? (
                  <div className="btn" onClick={this.onStopSoundDetect}>
                    Stop{' '}
                    <span role="img" aria-label="stop">
                      🛑
                    </span>
                  </div>
                ) : (
                  <div className="btn" onClick={this.onSoundDetect}>
                    Dj Master{' '}
                    <span role="img" aria-label="emotion">
                      🎧
                    </span>
                  </div>
                )}
              </div>
              <div className="btn-container">
                {this.state.isSpeechRecognition ? (
                  <span role="img" aria-label="hear">
                    👂
                  </span>
                ) : (
                  <div className="btn" onClick={this.onSpeechDetect}>
                    Speech Recognition
                    <span role="img" aria-label="speech">
                      🗣️
                    </span>
                  </div>
                )}
              </div>
              <div className="btn-container">
                {this.state.appModel === APP_MODE.EMOTION ? (
                  <div className="btn" onClick={this.onStopEmotionDetect}>
                    Stop{' '}
                    <span role="img" aria-label="stop">
                      🛑
                    </span>
                  </div>
                ) : (
                  <div className="btn" onClick={this.onEmotionDetect}>
                    Emotion Recognition{' '}
                    <span role="img" aria-label="emotion">
                      🥺
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="output-container">
              <div className="light-bulb">
                {this.state.isOn && <LightBulb color={this.state.color} />}
                {!this.state.isOn && (
                  <span role="img" aria-label="wtf" className="emoji">
                    😱
                  </span>
                )}
              </div>

              {this.state.appModel === APP_MODE.EMOTION && this.state.emotion && (
                <div>
                  <span role="img" aria-label="emotion" className="emoji">
                    {EMOTION_EMOJI[this.state.emotion]}
                  </span>
                </div>
              )}
            </div>

            {this.state.appModel === APP_MODE.EMOTION && (
              <div className="output-container" ref={this.emotionRef}>
                <video className="video-input" ref={this.videoRef} autoPlay muted />
              </div>
            )}

            {this.state.appModel === APP_MODE.SOUND_BOX && (
              <SoundBox
                background={'#fff'}
                color={this.state.color}
                onChangeDecibelLvl={this.changeColor}
                style={{
                  width: '100vw',
                  height: '100vh',
                }}
              />
            )}
          </>
        )}
      </div>
    );
  }
}

export default App;
