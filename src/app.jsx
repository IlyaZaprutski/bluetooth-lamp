import React from 'react';

import { ChromePicker } from 'react-color';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

import { ToastContainer, toast,Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import LightBulb from './light-bulb';

import recognition from './speech-recognition';

import colors from './colors.json';

import './app.css';

const getColorData = ({ r, g, b }) => {
    return new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
};

const getColor = rgb => {
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
};

const getRandomRgb = () => {
    var o = Math.round,
        r = Math.random,
        s = 255;

    return {
        r: o(r() * s),
        g: o(r() * s),
        b: o(r() * s),
    };
};

const POWER_ON_DATA = new Uint8Array([0xcc, 0x23, 0x33]);
const POWER_OFF_DATA = new Uint8Array([0xcc, 0x24, 0x33]);

const DEFAULT_COLOR = {
    r: 255,
    g: 0,
    b: 0,
};

const COLORS_MAP = new Map(colors.map(i => [i.name, i.color]));

class App extends React.Component {
    constructor(props) {
        super(props);

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
        isConnected: false,
        isOn: true,
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

        await this.characteristic.writeValue(getColorData(DEFAULT_COLOR));
    };

    changeColor = async rgbColor => {
        this.setState({ color: getColor(rgbColor) });

        await this.characteristic.writeValue(getColorData(rgbColor));
    };

    handleChangeComplete = color => this.changeColor(color.rgb);

    onPowerToggle = async () => {
        const commandData = this.state.isOn ? POWER_OFF_DATA : POWER_ON_DATA;

        await this.characteristic.writeValue(commandData);

        this.setState({
            isOn: !this.state.isOn,
        });
    };

    onRandomGenerate = () => {
        setInterval(async () => {
            const color = getRandomRgb();

            this.setState({ color: getColor(color) });

            await this.characteristic.writeValue(getColorData(color));
        }, 700);
    };

    onSpeechDetect = () => {
        recognition.start();
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
                        </div>

                        <div className="light-bulb-container">
                            <div className="light-bulb">
                                {this.state.isOn && <LightBulb color={this.state.color} />}
                                {!this.state.isOn && (
                                    <span role="img" aria-label="wtf" className="light-bulb-off">
                                        😱
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default App;
