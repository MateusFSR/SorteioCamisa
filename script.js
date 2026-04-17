* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: radial-gradient(circle at top, #0f1f3d 0%, #090f1c 42%, #04070f 100%);
  color: #d1def4;
}

.container {
  width: min(900px, 92%);
  margin: 32px auto;
}

h1 {
  margin-bottom: 8px;
}

.main-title {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #ffffff;
  background: linear-gradient(90deg, #0f3d2b, #1a5a3a, #0d4528);
  border: 1px solid #3a7050;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 28px rgba(15, 39, 75, 0.45);
}

.subtitle {
  margin-top: 0;
  color: #8fc78f;
  text-align: center;
}

.card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #244035;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.5);
}

form {
  display: grid;
  gap: 10px;
}

label {
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #2f5038;
  border-radius: 8px;
  font-size: 15px;
  background: #0f172a;
  color: #d4f0d4;
}

button {
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #1d4d35, #2a5f45);
  color: #fff;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
}

button:hover {
  filter: brightness(0.95);
}

#participants-list {
  margin: 0;
  padding-left: 18px;
}

#participants-list li {
  margin: 6px 0;
}

.result p {
  font-size: 18px;
  font-weight: 700;
  color: #88b088;
}

#cloud-status {
  display: none;
}

.wheel-wrapper {
  position: relative;
  width: min(460px, 100%);
  margin: 8px auto;
  aspect-ratio: 1 / 1;
}

.pointer {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
  border-top: 28px solid #6b8f6b;
  z-index: 3;
  filter: drop-shadow(0 0 8px rgba(80, 130, 80, 0.8));
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 8px solid #244035;
  position: relative;
  overflow: hidden;
  background: #0f172a;
  box-shadow: inset 0 0 24px rgba(15, 23, 42, 0.85), 0 8px 28px rgba(2, 6, 23, 0.6);
  transition: transform 0ms linear;
}

.wheel-segment-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  font-size: 12px;
  font-weight: 700;
  color: #eff6ff;
  text-shadow: 0 1px 4px rgba(2, 6, 23, 0.9);
  white-space: nowrap;
  pointer-events: none;
}

.hidden {
  display: none;
}

.roulette-display {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 10px;
  background: #0b1120;
  border: 1px solid #244035;
  color: #a8c9a8;
}

.result h2 {
  margin-top: 0;
  margin-bottom: 10px;
  text-align: center;
}

.result p {
  text-align: center;
}

.roulette-display.spinning {
  animation: pulseGreen 0.28s infinite;
}

.draw-icon-button {
  position: fixed;
  bottom: 140px;
  right: 20px;
  z-index: 40;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a5a, #2d1d4d);
  border: 2px solid #504a70;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(11, 26, 48, 0.6);
  transition: all 200ms ease;
  cursor: pointer;
}

.draw-icon-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(11, 26, 48, 0.8);
  filter: brightness(1.05);
}

.draw-icon-button:active {
  transform: scale(0.95);
}

.save-icon-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 40;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a5f45, #1d4d35);
  border: 2px solid #3a7050;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(11, 26, 48, 0.6);
  transition: all 200ms ease;
  cursor: pointer;
}

.save-icon-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(11, 26, 48, 0.8);
  filter: brightness(1.05);
}

.save-icon-button:active {
  transform: scale(0.95);
}

.reset-icon-button {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 40;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #5a3a2a, #3d2d1d);
  border: 2px solid #704a3a;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(11, 26, 48, 0.6);
  transition: all 200ms ease;
  cursor: pointer;
}

.reset-icon-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(11, 26, 48, 0.8);
  filter: brightness(1.05);
}

.reset-icon-button:active {
  transform: scale(0.95);
}

@media (max-width: 680px) {
  .draw-icon-button {
    bottom: 128px;
    right: 16px;
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .save-icon-button {
    bottom: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .reset-icon-button {
    bottom: 72px;
    right: 16px;
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}

.toast-notification {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 41;
  background: rgba(26, 48, 36, 0.95);
  border: 1px solid #3a7050;
  border-radius: 8px;
  padding: 12px 16px;
  color: #a8d4a8;
  font-size: 13px;
  font-weight: 600;
  max-width: 220px;
  word-wrap: break-word;
  box-shadow: 0 4px 12px rgba(2, 6, 23, 0.6);
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
  transition: all 280ms ease;
  backdrop-filter: blur(4px);
}

.toast-notification.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 680px) {
  .toast-notification {
    bottom: 70px;
    right: 16px;
    max-width: 180px;
    font-size: 12px;
    padding: 10px 14px;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 30;
}

.modal-overlay.hidden {
  display: none;
}

.modal-card {
  width: min(460px, 100%);
  border-radius: 14px;
  border: 1px solid #3a7050;
  background: linear-gradient(180deg, #0c1525 0%, #12223b 100%);
  box-shadow: 0 16px 34px rgba(2, 6, 23, 0.65);
  padding: 22px;
  text-align: center;
}

.modal-card h2 {
  margin-top: 0;
  color: #afd4af;
}

.modal-card p {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.modal-button-secondary,
.modal-button-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
  font-size: 14px;
}

.modal-button-secondary {
  background: #1a3d2d;
  color: #fff;
  flex: 1;
}

.modal-button-secondary:hover {
  background: #0f2a1f;
  filter: brightness(1.1);
}

.modal-button-danger {
  background: linear-gradient(90deg, #6b2a2a, #8b3a3a);
  color: #fff;
  flex: 1;
  border: 1px solid #9b5a5a;
}

.modal-button-danger:hover {
  background: linear-gradient(90deg, #7b3a3a, #9b4a4a);
  filter: brightness(1.1);
}

.modal-button-danger:active {
  transform: scale(0.98);
}

#available-numbers {
  width: 100%;
}

#available-numbers > p {
  text-align: center;
  margin: 0;
  color: #b8d4b8;
}

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
  gap: 8px;
  padding: 8px;
}

.number-square {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #264d35, #255c3b);
  border: 2px solid #3a7050;
  border-radius: 8px;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  cursor: default;
  transition: all 200ms ease;
  box-shadow: 0 4px 12px rgba(11, 26, 48, 0.4);
}

.number-square:hover {
  background: linear-gradient(135deg, #2f6b4a, #2a734a);
  border-color: #4a9060;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(54, 120, 80, 0.5);
}

@keyframes pulseGreen {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(80, 130, 80, 0.2);
  }
  50% {
    transform: scale(1.015);
    box-shadow: 0 0 16px rgba(80, 130, 80, 0.45);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(80, 130, 80, 0.2);
  }
}
