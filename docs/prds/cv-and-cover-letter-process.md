# CV and Cover Letter Process

```mermaid
flowchart TD
  A["Job Seeker creates or updates Candidate Profile"] --> B["Job Seeker adds Vacancy Source"]
  B --> C["Auto Vacancy creates Vacancy Understanding"]
  C --> D{"Vacancy Questions needed?"}
  D -- "Yes" --> E["Job Seeker answers Vacancy Questions"]
  E --> C
  D -- "No" --> F["Application Package exists"]

  F --> G["Create CV Draft"]
  G --> H["Job Seeker edits CV Draft"]
  H --> I{"Generate PDF Version?"}
  I -- "Yes" --> J["Immutable PDF Version"]
  I -- "No" --> H
  H --> K{"Regenerate CV Draft?"}
  K -- "Yes, after confirmation" --> G
  K -- "No" --> H

  F --> L["Manage global Cover Letter Examples"]
  L --> M["Upload PDF or paste text"]
  M --> N["Extract reusable example text"]

  F --> O1["Tone: direct, formal, etc."]
  F --> O2["Addressee: company, person, anonymous"]
  F --> O3["Length"]
  F --> O4["Focus"]
  F --> O5["Evidence style"]
  F --> O6["Opening style"]
  F --> O7["Closing style"]

  N --> P["Select 0-5 Cover Letter Examples"]
  P --> Q["Create Cover Letter Draft"]
  O1 --> Q
  O2 --> Q
  O3 --> Q
  O4 --> Q
  O5 --> Q
  O6 --> Q
  O7 --> Q
  C --> Q
  A --> Q
  R["Application Material Rules"] --> Q

  Q --> S["Job Seeker edits Cover Letter Draft"]
  S --> T{"Regenerate Cover Letter Draft?"}
  T -- "Yes, after confirmation" --> Q
  T -- "No" --> S

  S --> U["Future: Cover Letter Review"]
  U --> V["HR-specialist critique tied to draft revision"]
  V --> W{"Job Seeker applies changes?"}
  W -- "Yes" --> S
  W -- "No" --> X["Review kept as critique only"]

  J --> Y["Application materials ready outside Auto Vacancy"]
  S --> Y
```

Note: exact placement of the Cover Letter step is provisional until prototyping. Current assumption: available once the Application Package exists, shown after the CV workspace.
