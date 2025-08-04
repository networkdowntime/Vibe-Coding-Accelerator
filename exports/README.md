# Exports Directory

This directory contains the results of LLM processing jobs. Each job creates a subdirectory with the following structure:

```
exports/
├── {job-id}/
│   ├── original/          # Original files before processing
│   ├── processed/         # LLM-processed versions
│   ├── reports/           # Analysis reports for each file
│   └── summary.json       # Processing summary
```

## Summary Format

The `summary.json` file contains:
- Job ID and metadata
- Total files processed
- Completion timestamp
- List of all processed files with paths

## Report Format

Each report file contains:
- Analysis of the original code/content
- Suggestions for improvements
- Explanation of changes made
- Processing timestamp
