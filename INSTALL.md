# Installation Guide

## System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Python**: 3.8 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Camera**: Built-in webcam or USB camera
- **Internet**: Required for AI coaching feature (OpenAI API)

## Step-by-Step Installation

### 1. Install Python

Download and install Python from [python.org](https://www.python.org/downloads/)

Verify installation:
```bash
python --version
# Should show Python 3.8 or higher
```

### 2. Clone the Repository

```bash
git clone https://github.com/namitzz/posture.git
cd posture
```

### 3. Create Virtual Environment (Recommended)

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- MediaPipe (pose detection)
- OpenCV (camera/video processing)
- NumPy (numerical operations)
- pyttsx3 (text-to-speech)
- pygame (audio support)
- OpenAI (AI coaching)
- python-dotenv (environment variables)

### 5. Set Up OpenAI API Key

#### Option A: Environment Variable

**On Windows:**
```bash
setx OPENAI_API_KEY "your-api-key-here"
```

**On macOS/Linux:**
```bash
export OPENAI_API_KEY="your-api-key-here"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

#### Option B: .env File (Recommended)

Create a `.env` file in the project root:
```bash
OPENAI_API_KEY=your-api-key-here
```

**Get your API key:**
1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new secret key

**Note:** The app will work without an API key, but AI coaching will be disabled.

### 6. Test Installation

Run the test suite:
```bash
python tests/test_squat_analyzer.py
```

Or with pytest:
```bash
pytest tests/
```

### 7. Run the Application

```bash
cd src
python main.py
```

## Troubleshooting

### Camera Not Opening

- **Windows**: Check camera permissions in Settings > Privacy > Camera
- **macOS**: Grant terminal camera access in System Preferences > Security & Privacy
- **Linux**: Ensure your user is in the `video` group:
  ```bash
  sudo usermod -a -G video $USER
  ```

### MediaPipe Import Error

```bash
pip install --upgrade mediapipe
```

### Audio Not Working

**Windows:**
- Install espeak: Download from [espeak.sourceforge.net](http://espeak.sourceforge.net)

**macOS:**
- Built-in text-to-speech should work automatically

**Linux:**
```bash
sudo apt-get install espeak
```

### OpenCV Installation Issues

If OpenCV fails to install:
```bash
pip install --upgrade pip
pip install opencv-python-headless
```

### "No module named 'xyz'" Error

Ensure virtual environment is activated and dependencies are installed:
```bash
pip install -r requirements.txt
```

## Platform-Specific Notes

### Windows
- May need to install Visual C++ Redistributable
- Windows Defender might flag the app on first run

### macOS
- May need to install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Linux (Ubuntu/Debian)
Additional system dependencies:
```bash
sudo apt-get update
sudo apt-get install python3-dev python3-pip
sudo apt-get install libsm6 libxext6 libxrender-dev
sudo apt-get install espeak
```

## Next Steps

After installation, see [USAGE.md](USAGE.md) for how to use the app.
