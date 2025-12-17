# Contributing to SafeDrive

First off, thank you for considering contributing to SafeDrive! It's people like you that make SafeDrive such a great tool for promoting safer driving habits.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- **Be respectful**: Treat everyone with respect. Harassment and abuse are never tolerated.
- **Be collaborative**: Work together and help each other.
- **Be inclusive**: Welcome newcomers and encourage diverse perspectives.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected to see
- **Include screenshots** if applicable
- **Include your environment details** (OS, browser, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding standards** described below
3. **Make your changes** and ensure they work correctly
4. **Add tests** if applicable
5. **Update documentation** to reflect your changes
6. **Commit your changes** with clear, descriptive commit messages
7. **Push to your fork** and submit a pull request

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/safedrive.git
   cd safedrive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid using `any` type when possible
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Follow React best practices

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Use meaningful comments for complex logic
- Keep lines under 100 characters when possible

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests when applicable

Examples:
```
Add user authentication feature
Fix navigation routing bug (#123)
Update README with Docker instructions
Refactor map component for better performance
```

## Project Structure

```
safedrive/
├── components/       # React components
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── screens/         # Main screen components
├── utils/           # Utility functions
├── data/            # Static data files
├── nginx/           # Nginx configuration
├── scripts/         # Deployment and utility scripts
└── docs/            # Additional documentation
```

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

```bash
npm test
```

## Docker Development

To test your changes in a Docker environment:

```bash
# Build the Docker image
docker build -t safedrive-dev .

# Run the container
docker run -p 8080:8080 -e PORT=8080 safedrive-dev
```

## Documentation

- Update the README.md if you change functionality
- Add JSDoc comments for functions and components
- Update DEPLOYMENT.md for deployment-related changes
- Keep ARCHITECTURE.md up to date with structural changes

## Questions?

Feel free to open an issue with your question, or reach out to the maintainers directly.

## License

By contributing to SafeDrive, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SafeDrive! 🚗💚
