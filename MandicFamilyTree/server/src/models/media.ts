import { db } from "../db/connection";

export type MediaKind = "photo" | "document";

export interface MediaRow {
  id: number;
  person_id: number;
  file_url: string;
  kind: MediaKind;
  caption: string | null;
  uploaded_by: number | null;
  created_at: string;
}

export interface CreateMediaInput {
  personId: number;
  fileUrl: string;
  kind: MediaKind;
  caption?: string;
  uploadedBy?: number;
}

export function createMedia(input: CreateMediaInput): MediaRow {
  const result = db
    .prepare(
      `INSERT INTO media (person_id, file_url, kind, caption, uploaded_by)
       VALUES (@personId, @fileUrl, @kind, @caption, @uploadedBy)`
    )
    .run({
      personId: input.personId,
      fileUrl: input.fileUrl,
      kind: input.kind,
      caption: input.caption ?? null,
      uploadedBy: input.uploadedBy ?? null,
    });

  return db
    .prepare(`SELECT * FROM media WHERE id = @id`)
    .get({ id: Number(result.lastInsertRowid) }) as unknown as MediaRow;
}

export function listMediaForPerson(personId: number): MediaRow[] {
  return db
    .prepare(`SELECT * FROM media WHERE person_id = @personId ORDER BY created_at DESC`)
    .all({ personId }) as unknown as MediaRow[];
}
