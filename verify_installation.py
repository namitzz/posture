#!/usr/bin/env python3
"""
Verify installation and check system compatibility.
Run this after installing dependencies to ensure everything is set up correctly.
"""
import sys
import platform


def check_python_version():
    """Check if Python version is compatible."""
    print("Checking Python version...", end=" ")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✓ {sys.version.split()[0]}")
        return True
    else:
        print(f"✗ {sys.version.split()[0]} (requires 3.8+)")
        return False


def check_module(module_name, package_name=None):
    """Check if a Python module can be imported."""
    if package_name is None:
        package_name = module_name
    
    try:
        __import__(module_name)
        print(f"✓ {package_name}")
        return True
    except ImportError:
        print(f"✗ {package_name} (not installed)")
        return False


def check_camera():
    """Check if camera is accessible."""
    print("Checking camera access...", end=" ")
    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None:
                print("✓ Camera accessible")
                return True
            else:
                print("⚠ Camera opens but no frame captured")
                return False
        else:
            print("⚠ Cannot open camera")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def check_openai_key():
    """Check if OpenAI API key is configured."""
    print("Checking OpenAI API key...", end=" ")
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        key = os.getenv('OPENAI_API_KEY')
        if key and key != 'your-api-key-here':
            print("✓ Configured")
            return True
        else:
            print("⚠ Not configured (AI coaching will be disabled)")
            return False
    except Exception as e:
        print(f"⚠ Not configured (AI coaching will be disabled)")
        return False


def main():
    """Run all verification checks."""
    print("="*60)
    print("POSTURE APP - INSTALLATION VERIFICATION")
    print("="*60)
    print()
    
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Architecture: {platform.machine()}")
    print()
    
    print("Core Requirements:")
    print("-" * 60)
    
    checks = []
    checks.append(check_python_version())
    
    print("\nRequired Dependencies:")
    print("-" * 60)
    checks.append(check_module('mediapipe'))
    checks.append(check_module('cv2', 'opencv-python'))
    checks.append(check_module('numpy'))
    checks.append(check_module('pyttsx3'))
    checks.append(check_module('pygame'))
    
    print("\nOptional Dependencies:")
    print("-" * 60)
    checks.append(check_module('openai'))
    checks.append(check_module('dotenv', 'python-dotenv'))
    
    print("\nHardware:")
    print("-" * 60)
    camera_ok = check_camera()
    
    print("\nConfiguration:")
    print("-" * 60)
    openai_ok = check_openai_key()
    
    print()
    print("="*60)
    
    # Summary
    required_checks = checks[:6]  # Python, mediapipe, cv2, numpy, pyttsx3, pygame
    
    if all(required_checks):
        print("✓ ALL REQUIRED DEPENDENCIES INSTALLED")
        print()
        
        if not camera_ok:
            print("⚠ Warning: Camera not accessible")
            print("  - Check camera permissions")
            print("  - Try a different camera index")
            print("  - Use demo mode: python examples/demo_squat_analysis.py")
        
        if not openai_ok:
            print("⚠ Warning: OpenAI API key not configured")
            print("  - Set OPENAI_API_KEY in .env file")
            print("  - Or export OPENAI_API_KEY='your-key'")
            print("  - App will work with basic summaries")
        
        print()
        print("Ready to use! Run: cd src && python main.py")
    else:
        print("✗ MISSING REQUIRED DEPENDENCIES")
        print()
        print("To install dependencies, run:")
        print("  pip install -r requirements.txt")
        return 1
    
    print("="*60)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nVerification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nVerification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
