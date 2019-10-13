import React from 'react';

import { ChromePicker } from 'react-color';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import * as faceapi from 'face-api.js';

import LightBulb from './light-bulb';

import recognition from './speech-recognition';

import { getColorData, getColor, getRandomRgb } from './tools';

import { POWER_ON_DATA, POWER_OFF_DATA, DEFAULT_COLOR, COLORS_MAP, EMOTION_COLORS, EMOTION_EMOJI } from './constants';

import './app.css';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.videoRef = React.createRef();

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onnomatch = () => {
            console.log("I didn't recognise that color.");
        };

        recognition.onerror = event => {
            console.log(`Error occurred in recognition: ${event.error}`);
        };

        recognition.onresult = event => {
            const last = event.results.length - 1;
            const color = event.results[last][0].transcript.replace(/ё/g, 'е');

            if (COLORS_MAP.has(color)) {
                this.changeColor(COLORS_MAP.get(color));
            } else {
                toast('😢😢😢 Incorrect color!');
            }

            console.log(`Result received: ${color}.`);
            console.log(`Confidence: ${event.results[0][0].confidence}`);
        };
    }

    state = {
        color: getColor(DEFAULT_COLOR),
        isConnected: true,
        isOn: true,
        emotion: null,
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

        //  await this.characteristic.writeValue(getColorData(DEFAULT_COLOR));
    };

    changeColor = async rgbColor => {
        this.setState({ color: getColor(rgbColor) });

        //  await this.characteristic.writeValue(getColorData(rgbColor));
    };

    handleChangeComplete = color => this.changeColor(color.rgb);

    onPowerToggle = async () => {
        const commandData = this.state.isOn ? POWER_OFF_DATA : POWER_ON_DATA;

        // await this.characteristic.writeValue(commandData);

        this.setState({
            isOn: !this.state.isOn,
        });
    };

    onRandomGenerate = () => {
        setInterval(async () => {
            const color = getRandomRgb();

            this.setState({ color: getColor(color) });

            //  await this.characteristic.writeValue(getColorData(color));
        }, 700);
    };

    onSpeechDetect = () => {
        recognition.start();
    };

    onEmotionDetect = async () => {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceExpressionNet.loadFromUri('/models'),
            ]);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            const video = this.videoRef.current;
            video.srcObject = stream;

            setInterval(async () => {
                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceExpressions();

                if (detection) {
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
            }, 1000);
        } catch (error) {
            console.log(error);
        }
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
                    <button className="pair" onClick={this.onPair}>
                        Connect
                    </button>
                )}

                {this.state.isConnected && (
                    <>
                        <div className="picker-container" style={{ backgroundColor: this.state.color }}>
                            <div className="picker">
                                <ChromePicker
                                    color={this.state.color}
                                    onChangeComplete={this.handleChangeComplete}
                                    disableAlpha
                                />
                            </div>

                            <div className="btn-container">
                                <Toggle
                                    id="power-status"
                                    defaultChecked={this.state.isOn}
                                    onChange={this.onPowerToggle}
                                />
                                <label className="toggle-label" htmlFor="power-status">{`Turn ${
                                    this.state.isOn ? 'Off' : 'On'
                                }`}</label>
                            </div>

                            <div className="btn-container">
                                <div className="btn" onClick={this.onRandomGenerate}>
                                    Generate Random
                                </div>
                            </div>
                            <div className="btn-container">
                                <div className="btn" onClick={this.onSpeechDetect}>
                                    Speech Recognition
                                </div>
                            </div>
                            <div className="btn-container">
                                <div className="btn" onClick={this.onEmotionDetect}>
                                    Emotion Recognition
                                </div>
                            </div>
                        </div>

                        <div className="light-bulb-container">
                            <div className="light-bulb">
                                {this.state.isOn && <LightBulb color={this.state.color} />}
                                {!this.state.isOn && (
                                    <span role="img" aria-label="wtf" className="emoji">
                                        😱
                                    </span>
                                )}
                            </div>

                            {this.state.emotion && (
                                <div>
                                    <span role="img" aria-label="emotion" className="emoji">
                                        {EMOTION_EMOJI[this.state.emotion]}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <video className="video-input" ref={this.videoRef} autoPlay muted />
            </div>
        );
    }
}

export default App;
