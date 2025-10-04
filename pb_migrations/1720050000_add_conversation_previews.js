migrate((db) => {
  const dao = new Dao(db)
  dao.db().exec(`
    CREATE VIEW conversation_previews AS
    SELECT
      m.user || '_' || c.id AS id,
      m.user AS user_id,
      c.id AS conversation_id,
      lm.id AS latest_message_id,
      lm.text AS latest_message_text,
      lm.created AS latest_message_created,
      lm.sender AS latest_message_sender,
      lm.image AS latest_message_image,
      CASE
        WHEN lm.id IS NULL THEN 0
        WHEN lm.sender = m.user THEN 0
        WHEN m.last_read IS NULL THEN 1
        WHEN lm.created > m.last_read THEN 1
        ELSE 0
      END AS unread_count
    FROM conversations c
    JOIN memberships m ON m.conversation = c.id
    LEFT JOIN messages lm ON lm.id = (
      SELECT id
      FROM messages
      WHERE conversation = c.id
      ORDER BY created DESC
      LIMIT 1
    );
  `)
}, (db) => {
  const dao = new Dao(db)
  dao.db().exec('DROP VIEW IF EXISTS conversation_previews;')
})
