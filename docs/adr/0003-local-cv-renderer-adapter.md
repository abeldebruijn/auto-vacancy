# Local CV Renderer Adapter

Auto Vacancy stores editable CV Drafts in Convex and renders immutable PDF Versions inside the application. The renderer follows the `CvInput` and `CvProfile` contract from the `job_application_ts` project, but the app implements the mapping and PDFKit rendering locally instead of shelling out to that project's CLI.

Shelling out would make local development quick, but it would bind Auto Vacancy to one filesystem path and temporary JSON files. Packaging the external project first would be cleaner long term, but would delay the Application Package workflow. A local adapter keeps the Job Seeker experience in Auto Vacancy, avoids exposing JSON, and preserves the external generator's current data shape as the integration reference.
