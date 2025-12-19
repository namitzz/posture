# Contributing to Posture

Thank you for your interest in contributing to the Real-Time Gym Form Correction App! 

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your system info (OS, Python version, etc.)

### Feature Requests

We'd love to hear your ideas! Create an issue with:
- Description of the feature
- Use case / why it's valuable
- Potential implementation approach

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed
4. **Test your changes**
   ```bash
   pytest tests/
   ```
5. **Commit with clear messages**
   ```bash
   git commit -m "Add feature: description"
   ```
6. **Push and create a Pull Request**

### Areas We Need Help

- **🏋️ Exercise Modules**: Add deadlift, bench press, overhead press analyzers
- **📱 Mobile Development**: Android/iOS native apps
- **🎨 UI/UX**: Improve visual feedback and user interface
- **🧪 Testing**: Expand test coverage
- **📚 Documentation**: Tutorials, videos, translations
- **🤖 AI Models**: Train custom form detection models
- **🏃 Performance**: Optimization for mobile devices

### Fitness Expertise

If you're a certified trainer or coach:
- Review form detection rules
- Suggest improvements to feedback
- Help define new exercise patterns
- Validate biomechanics logic

## Development Setup

1. Clone the repo
2. Create virtual environment
3. Install dev dependencies:
   ```bash
   pip install -r requirements.txt
   pip install pytest black flake8 mypy
   ```

## Code Style

- **Formatting**: Use `black` for Python formatting
  ```bash
  black src/ tests/
  ```
- **Linting**: Run `flake8`
  ```bash
  flake8 src/ tests/
  ```
- **Type Hints**: Use type hints where appropriate
- **Docstrings**: Document all public functions/classes

## Testing Guidelines

- Write tests for new features
- Maintain or improve code coverage
- Test on multiple platforms if possible
- Include edge cases

## Pull Request Process

1. Ensure tests pass
2. Update README.md if needed
3. Add your changes to the PR description
4. Link related issues
5. Wait for review from maintainers

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help newcomers feel welcome

## Questions?

Feel free to:
- Open an issue for discussion
- Reach out to maintainers
- Join our community (coming soon)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Invited to beta testing
- Part of the community

Thank you for helping make fitness tech more accessible! 💪
