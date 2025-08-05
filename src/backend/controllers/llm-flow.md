# LLM Processing Flow

This document describes the LLM processing flow implemented in `llmController.js`.

## Overview

The LLM controller handles asynchronous processing of project files through an external LLM API. It provides endpoints for starting, monitoring, canceling, and retrieving results from processing jobs.

## Processing Flow

```mermaid
flowchart TD
    A[Client Requests LLM Processing] --> B[POST /api/llm/:projectId/start]
    B --> C[startProcessing Function]
    
    C --> D{Project Exists?}
    D -->|No| E[Return 404 Error]
    D -->|Yes| F[Generate Job ID]
    
    F --> G[Initialize Job Object]
    G --> H[Store Job in Memory Map]
    H --> I[Start Async Processing]
    I --> J[Return Job ID to Client]
    
    %% Async Processing Flow
    I --> K[processProjectAsync Function]
    K --> L[Set Status: PROCESSING]
    L --> M[Get Project Files]
    
    M --> N{Files Found?}
    N -->|No| O[Set Status: FAILED]
    N -->|Yes| P[Create LLM Client]
    
    P --> Q[Initialize Progress Tracking]
    Q --> R[Start File Processing Loop]
    
    %% File Processing Loop
    R --> S{More Files?}
    S -->|No| T[Save Processed Files]
    S -->|Yes| U{Job Cancelled?}
    
    U -->|Yes| V[Stop Processing]
    U -->|No| W[Process Single File]
    
    W --> X[processFileWithLLM Function]
    X --> Y[Create LLM Prompt]
    Y --> Z[Send Request to LLM API]
    
    Z --> AA{API Response OK?}
    AA -->|No| BB[Handle API Error]
    AA -->|Yes| CC[Parse LLM Response]
    
    CC --> DD{JSON Parseable?}
    DD -->|No| EE[Create Fallback Response]
    DD -->|Yes| FF[Extract Structured Data]
    
    EE --> GG[Update Progress: Completed++]
    FF --> GG
    BB --> HH[Update Progress: Failed++]
    HH --> II[Log Error]
    
    GG --> JJ[Small Delay to Prevent Rate Limiting]
    II --> JJ
    JJ --> S
    
    %% Save Results
    T --> KK{Any Processed Files?}
    KK -->|No| LL[Set Status: FAILED]
    KK -->|Yes| MM[saveProcessedFiles Function]
    
    MM --> NN[Create Export Directory]
    NN --> OO[Save Original Files]
    OO --> PP[Save Processed Files]
    PP --> QQ[Save Analysis Reports]
    QQ --> RR[Create Summary Report]
    
    RR --> SS[Set Status: COMPLETED]
    LL --> SS
    SS --> TT[End Processing]
    
    %% Status Monitoring
    UU[Client Polls Status] --> VV[GET /api/llm/:jobId/status]
    VV --> WW[getStatus Function]
    WW --> XX{Job Exists?}
    XX -->|No| YY[Return 404 Error]
    XX -->|Yes| ZZ[Calculate Progress Percentage]
    ZZ --> AAA[Return Job Status & Progress]
    
    %% Cancellation Flow
    BBB[Client Cancels Job] --> CCC[POST /api/llm/:jobId/cancel]
    CCC --> DDD[cancelProcessing Function]
    DDD --> EEE{Job Exists?}
    EEE -->|No| FFF[Return 404 Error]
    EEE -->|Yes| GGG{Job Can Be Cancelled?}
    GGG -->|No| HHH[Return 400 Error]
    GGG -->|Yes| III[Set Status: CANCELLED]
    III --> JJJ[Return Success Response]
    
    %% Retry Flow
    KKK[Client Retries Failed Job] --> LLL[POST /api/llm/:jobId/retry]
    LLL --> MMM[retryProcessing Function]
    MMM --> NNN{Job Exists?}
    NNN -->|No| OOO[Return 404 Error]
    NNN -->|Yes| PPP{Job Status is FAILED?}
    PPP -->|No| QQQ[Return 400 Error]
    PPP -->|Yes| RRR[Reset Job Status]
    RRR --> SSS[Increment Retry Count]
    SSS --> TTT[Restart Processing from Last Position]
    TTT --> K
    
    %% Results Retrieval
    UUU[Client Gets Results] --> VVV[GET /api/llm/:jobId/results]
    VVV --> WWW[getResults Function]
    WWW --> XXX{Job Exists?}
    XXX -->|No| YYY[Return 404 Error]
    XXX -->|Yes| ZZZ{Job Completed?}
    ZZZ -->|No| AAAA[Return 400 Error]
    ZZZ -->|Yes| BBBB[Return Processed Files & Analysis]
    
    %% Error Handling
    style E fill:#ffcccc
    style O fill:#ffcccc
    style LL fill:#ffcccc
    style YY fill:#ffcccc
    style FFF fill:#ffcccc
    style HHH fill:#ffcccc
    style OOO fill:#ffcccc
    style QQQ fill:#ffcccc
    style YYY fill:#ffcccc
    style AAAA fill:#ffcccc
    
    %% Success States
    style J fill:#ccffcc
    style SS fill:#ccffcc
    style AAA fill:#ccffcc
    style JJJ fill:#ccffcc
    style BBBB fill:#ccffcc
    
    %% Processing States
    style K fill:#ffffcc
    style X fill:#ffffcc
    style MM fill:#ffffcc
```

## Key Components

### 1. Job Management
- **Job Storage**: In-memory Map for storing job states (production should use Redis/Database)
- **Job States**: PENDING → PROCESSING → COMPLETED/FAILED/CANCELLED
- **Progress Tracking**: Tracks total, completed, failed, and current file being processed

### 2. File Processing
- **File Discovery**: Recursively scans project files directory
- **File Filtering**: Only processes relevant file types (.js, .ts, .json, .md, .yml, .html, .css, .scss)
- **Sequential Processing**: Processes files one by one to avoid overwhelming the API

### 3. LLM Integration
- **API Client**: Creates axios client with configurable endpoint and API key
- **Request Format**: Sends structured prompts to OpenAI-compatible API
- **Response Parsing**: Attempts to parse JSON responses, falls back to plain text
- **Error Handling**: Handles rate limits, authentication errors, and timeouts

### 4. Result Storage
- **Export Structure**: Organizes results into original/, processed/, and reports/ directories
- **File Preservation**: Keeps original files alongside processed versions
- **Analysis Reports**: Stores detailed analysis for each file in JSON format
- **Summary Generation**: Creates overall summary of the processing job

### 5. API Endpoints
- `POST /api/llm/:projectId/start` - Start processing
- `GET /api/llm/:jobId/status` - Get job status and progress
- `POST /api/llm/:jobId/cancel` - Cancel running job
- `POST /api/llm/:jobId/retry` - Retry failed job
- `GET /api/llm/:jobId/results` - Get final results

## Environment Configuration

The controller requires the following environment variables:
- `OPENAPI_ENDPOINT` - The LLM API endpoint URL (required)
- `OPENAPI_API_KEY` - The API key for authentication (optional)

## Error Handling

The system handles various error scenarios:
- **Project Not Found**: Returns 404 when project doesn't exist
- **API Errors**: Handles rate limits, authentication failures, and timeouts
- **File Processing Errors**: Continues processing other files when individual files fail
- **Cancellation**: Gracefully stops processing when requested
- **Retry Logic**: Allows restarting failed jobs from last successful point
