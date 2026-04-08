"""
Tests that package modules can be imported safely.
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_import_src_squat_analyzer():
    """Importing as a package should resolve local imports."""
    module = importlib.import_module("src.squat_analyzer")
    assert module.SquatAnalyzer is not None


def test_import_src_main():
    """Importing src.main should not require OpenCV at import time."""
    module = importlib.import_module("src.main")
    assert module.PostureApp is not None
