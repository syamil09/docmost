import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { ActionIcon, Button, Group, Text, Tooltip } from "@mantine/core";
import { IconFileUpload, IconCode, IconEye, IconX } from "@tabler/icons-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { buildSrcdoc, readHtmlFile, MAX_HTML_FILE_SIZE } from "./html-block.utils";
import { ResizableWrapper } from "../common/resizable-wrapper";
import clsx from "clsx";
import classes from "./html-block.module.css";

export default function HtmlBlockView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { node, selected, updateAttributes, deleteNode, editor } = props;
  const { code, title, width, height } = node.attrs;

  const [editing, setEditing] = useState(false);
  const [internalCode, setInternalCode] = useState(code || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalCode(code || "");
  }, [code]);

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      updateAttributes({ width: newWidth, height: newHeight });
    },
    [updateAttributes],
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newCode = e.target.value;
      setInternalCode(newCode);
      updateAttributes({ code: newCode });
    },
    [updateAttributes],
  );

  const handleFileUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_HTML_FILE_SIZE) {
        notifications.show({
          message: t("HTML file exceeds the 512 KB size limit"),
          position: "top-right",
          color: "red",
        });
        return;
      }

      try {
        const content = await readHtmlFile(file);
        const fileName = file.name.replace(/\.(html?|htm)$/i, "");
        setInternalCode(content);
        updateAttributes({ code: content, title: fileName });
        if (!editing) {
          setEditing(true);
        }
      } catch (err) {
        notifications.show({
          message: t("Failed to read HTML file"),
          position: "top-right",
          color: "red",
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [updateAttributes, editing, t],
  );

  const handleEditToggle = useCallback(() => {
    setEditing((prev) => !prev);
  }, []);

  const handlePreviewToggle = useCallback(() => {
    if (editing) {
      setEditing(false);
    }
  }, [editing]);

  const handleRemove = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const showToolbar = editor.isEditable;
  const showTextarea = editor.isEditable && (editing || selected);

  return (
    <NodeViewWrapper
      data-drag-handle
      className={clsx(classes.wrapper, {
        "ProseMirror-selectednode": selected,
      })}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,text/html"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showToolbar && (
        <Group className={classes.toolbar} justify="space-between">
          <Group gap="xs">
            <Tooltip label={t("Upload HTML file")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={handleFileUpload}
              >
                <IconFileUpload size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={editing ? t("Show preview") : t("Edit code")}>
              <ActionIcon
                variant="subtle"
                color={editing ? "blue" : "gray"}
                onClick={editing ? handlePreviewToggle : handleEditToggle}
              >
                {editing ? <IconEye size={18} /> : <IconCode size={18} />}
              </ActionIcon>
            </Tooltip>

            {title && (
              <Text size="sm" c="dimmed">
                {title}
              </Text>
            )}
          </Group>

          <Tooltip label={t("Remove")}>
            <ActionIcon variant="subtle" color="red" onClick={handleRemove}>
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}

      {showTextarea && (
        <textarea
          className={classes.sourceArea}
          value={internalCode}
          onChange={handleCodeChange}
          placeholder={t("Enter HTML code or upload a file...")}
        />
      )}

      {!code && !showTextarea ? (
        <div className={classes.placeholder}>
          <Button
            variant="subtle"
            leftSection={<IconFileUpload size={18} />}
            onClick={handleFileUpload}
          >
            {t("Upload HTML file")}
          </Button>
          <Text className={classes.placeholderText}>
            {t("Or enter HTML code by clicking the edit button")}
          </Text>
        </div>
      ) : !showTextarea ? (
        <div className={classes.preview}>
          <ResizableWrapper
            initialWidth={width || 800}
            initialHeight={height || 600}
            minWidth={320}
            maxWidth={1200}
            minHeight={240}
            maxHeight={800}
            onResize={handleResize}
            isEditable={editor.isEditable}
            selected={selected}
          >
            <iframe
              className={classes.iframe}
              srcDoc={buildSrcdoc(code)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
              title={title || t("HTML Preview")}
            />
          </ResizableWrapper>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
