"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import {
  AtSign,
  Bold,
  Bookmark,
  CheckSquare2,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Palette,
  Quote,
  Trash2,
  Type,
  X,
} from "lucide-react";

type BannerColor =
  | "strong-red"
  | "strong-orange"
  | "strong-yellow"
  | "strong-blue"
  | "strong-purple"
  | "strong-pink"
  | "strong-green"
  | "strong-grey"
  | "red"
  | "orange"
  | "yellow"
  | "blue"
  | "purple"
  | "pink"
  | "green"
  | "grey";

const bannerColors: Array<{
  value: BannerColor;
  label: string;
  background: string;
  border: string;
  text: string;
  swatch: string;
}> = [
  { value: "strong-red", label: "Strong red banner", background: "#cf2933", border: "#9f1f27", text: "#ffffff", swatch: "#cf2933" },
  { value: "strong-orange", label: "Strong orange banner", background: "#f76707", border: "#c94f00", text: "#ffffff", swatch: "#f76707" },
  { value: "strong-yellow", label: "Strong yellow banner", background: "#f5b82e", border: "#c89012", text: "#1f2937", swatch: "#f5b82e" },
  { value: "strong-blue", label: "Strong blue banner", background: "#1971c2", border: "#125998", text: "#ffffff", swatch: "#1971c2" },
  { value: "strong-purple", label: "Strong purple banner", background: "#5f3dc4", border: "#4527a0", text: "#ffffff", swatch: "#5f3dc4" },
  { value: "strong-pink", label: "Strong pink banner", background: "#e83e8c", border: "#b82f6e", text: "#ffffff", swatch: "#e83e8c" },
  { value: "strong-green", label: "Strong green banner", background: "#2f9e6f", border: "#247b57", text: "#ffffff", swatch: "#2f9e6f" },
  { value: "strong-grey", label: "Strong grey banner", background: "#868e96", border: "#60676d", text: "#ffffff", swatch: "#868e96" },
  { value: "red", label: "Red banner", background: "#fff0f1", border: "#efb4b8", text: "#8f1d25", swatch: "#f2b8bc" },
  { value: "orange", label: "Orange banner", background: "#fff4e8", border: "#f4c99c", text: "#8a480d", swatch: "#f5c18b" },
  { value: "yellow", label: "Yellow banner", background: "#fff9db", border: "#ead98b", text: "#725d0b", swatch: "#f5e29f" },
  { value: "blue", label: "Blue banner", background: "#eaf4ff", border: "#a9ccef", text: "#14558d", swatch: "#a9ccef" },
  { value: "purple", label: "Purple banner", background: "#f2edff", border: "#c9b8f2", text: "#4e3296", swatch: "#c9b8f2" },
  { value: "pink", label: "Pink banner", background: "#fff0f6", border: "#efb3ce", text: "#96345e", swatch: "#efb3ce" },
  { value: "green", label: "Green banner", background: "#eaf8f1", border: "#acd9c3", text: "#246b4b", swatch: "#acd9c3" },
  { value: "grey", label: "Grey banner", background: "#f1f3f5", border: "#ced4da", text: "#495057", swatch: "#ced4da" },
];

const getBannerColor = (color: string) =>
  bannerColors.find((item) => item.value === color) ?? bannerColors[0];

function BannerNodeView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const color = getBannerColor(node.attrs.color);

  return (
    <NodeViewWrapper
      className="group/banner relative my-3 rounded-[8px] border px-5 py-4"
      style={{
        backgroundColor: color.background,
        borderColor: color.border,
        color: color.text,
      }}
      data-banner-color={color.value}
    >
      <div
        contentEditable={false}
        className={`absolute -top-11 right-0 z-20 items-center overflow-visible rounded-[8px] border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#202024] ${selected || isColorOpen || isMenuOpen ? "flex" : "hidden group-hover/banner:flex"}`}
      >
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setIsColorOpen((open) => !open);
            setIsMenuOpen(false);
          }}
          className="flex h-9 items-center gap-2 border-r border-slate-200 px-3 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Change banner color"
        >
          <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color.swatch }} />
          <Palette className="size-4" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setIsMenuOpen((open) => !open);
            setIsColorOpen(false);
          }}
          className="flex size-9 items-center justify-center text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Banner options"
        >
          <MoreHorizontal className="size-4" />
        </button>

        {isColorOpen && (
          <div className="absolute right-0 top-11 grid w-[270px] grid-cols-2 gap-1 rounded-[8px] border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#202024]">
            {bannerColors.map((item) => (
              <button
                key={item.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  updateAttributes({ color: item.value });
                  setIsColorOpen(false);
                }}
                className="flex items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <span className="size-4 shrink-0 rounded-[4px] border border-black/10" style={{ backgroundColor: item.swatch }} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {isMenuOpen && (
          <div className="absolute right-0 top-11 w-44 rounded-[8px] border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#202024]">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={deleteNode}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 className="size-4" /> Delete banner
            </button>
          </div>
        )}
      </div>
      <NodeViewContent className="min-h-6 outline-none [&>p]:my-0" />
    </NodeViewWrapper>
  );
}

const BannerNode = Node.create({
  name: "banner",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      color: {
        default: "strong-red",
        parseHTML: (element) => element.getAttribute("data-banner-color") || "strong-red",
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='banner']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const color = getBannerColor(HTMLAttributes.color);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "banner",
        "data-banner-color": color.value,
        style: `background-color:${color.background};border:1px solid ${color.border};color:${color.text};border-radius:8px;padding:16px 20px;`,
      }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BannerNodeView);
  },
});

function ToggleNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const collapsed = Boolean(node.attrs.collapsed);
  return (
    <NodeViewWrapper className="my-2 flex items-start gap-2 rounded-[8px] px-1 py-1">
      <button
        type="button"
        contentEditable={false}
        onClick={() => updateAttributes({ collapsed: !collapsed })}
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[6px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
        aria-label={collapsed ? "Expand toggle list" : "Collapse toggle list"}
      >
        <ChevronRight className={`size-4 transition-transform ${collapsed ? "" : "rotate-90"}`} />
      </button>
      <NodeViewContent className={`min-w-0 flex-1 [&>p]:my-0 ${collapsed ? "[&>*:not(:first-child)]:hidden" : ""}`} />
    </NodeViewWrapper>
  );
}

const ToggleNode = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-collapsed") === "true",
        renderHTML: (attributes) => ({
          "data-collapsed": String(Boolean(attributes.collapsed)),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='toggle-block']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle-block" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },
});

function Toggle({ pressed, onPressedChange, children, className = "" }: any) {
  return (
    <button
      type="button"
      onClick={() => onPressedChange(!pressed)}
      className={`inline-flex items-center justify-center rounded-[6px] text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
        pressed ? "bg-muted text-foreground" : "bg-transparent"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export interface RichTextPerson {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  people?: RichTextPerson[];
  toolbar?: boolean;
  plain?: boolean;
}

type CommandName =
  | "banner"
  | "checklist"
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "bulletList"
  | "orderedList"
  | "toggleList";

const editableBlockClasses =
  "[&_p]:my-1 [&_h1]:my-3 [&_h1]:text-[30px] [&_h1]:font-bold [&_h1]:leading-[1.2] [&_h2]:my-2.5 [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:leading-[1.25] [&_h3]:my-2 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:leading-[1.3] [&_h4]:my-2 [&_h4]:text-[17px] [&_h4]:font-semibold [&_h4]:leading-[1.35] [&_ul:not([data-type=taskList])]:my-2 [&_ul:not([data-type=taskList])]:list-disc [&_ul:not([data-type=taskList])]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li>p]:my-0 [&_li_ul]:my-1 [&_li_ol]:my-1 [&_ul[data-type=taskList]]:my-2 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]>label]:mt-1 [&_li[data-type=taskItem]>label]:shrink-0 [&_li[data-type=taskItem]>div]:min-w-0 [&_li[data-type=taskItem]>div]:flex-1 [&_li[data-type=taskItem]_input]:size-4 [&_li[data-type=taskItem]_input]:cursor-pointer [&_li[data-type=taskItem]_input]:accent-slate-900 [&_li[data-checked=true]>div]:text-slate-400 [&_li[data-checked=true]>div]:line-through";

const suggestionCommands: Array<{
  command: CommandName;
  label: string;
  icon: typeof Type;
}> = [
  { command: "banner", label: "Banner", icon: Bookmark },
  { command: "checklist", label: "Checklist", icon: CheckSquare2 },
];

const textCommands: Array<{
  command: CommandName;
  label: string;
  icon: typeof Type;
}> = [
  { command: "paragraph", label: "Normal text", icon: Type },
  { command: "heading1", label: "Heading 1", icon: Heading1 },
  { command: "heading2", label: "Heading 2", icon: Heading2 },
  { command: "heading3", label: "Heading 3", icon: Heading3 },
  { command: "heading4", label: "Heading 4", icon: Heading4 },
  { command: "checklist", label: "Checklist", icon: CheckSquare2 },
  { command: "bulletList", label: "Bulleted list", icon: List },
  { command: "orderedList", label: "Numbered list", icon: ListOrdered },
  { command: "toggleList", label: "Toggle list", icon: ChevronRight },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
  people,
  toolbar = true,
  plain = false,
}: RichTextEditorProps) {
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [bannerInsertRange, setBannerInsertRange] = useState<{ from: number; to: number } | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    setSelectedBannerIndex(0);
  }, [bannerInsertRange]);

  const commandListRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const bannerListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commandListRef.current) {
      const activeEl = commandListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedCommandIndex]);

  useEffect(() => {
    if (mentionListRef.current) {
      const activeEl = mentionListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedMentionIndex]);

  useEffect(() => {
    if (bannerListRef.current) {
      const activeEl = bannerListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedBannerIndex]);

  const syncTriggerMenus = (currentEditor: any) => {
    const { selection } = currentEditor.state;
    const { $from } = selection;
    
    // Fallback safe extraction: get up to 100 characters before the cursor
    const start = Math.max(0, $from.parentOffset - 100);
    const textBeforeCursor = $from.parent.textBetween(start, $from.parentOffset, undefined, "\ufffc");
    
    // Check match at the very end of the extracted slice
    const slashMatch = textBeforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([^\s@\n]*)$/);

    setSlashQuery(slashMatch ? slashMatch[1] : null);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);

    if (slashMatch || mentionMatch) {
      try {
        const { from } = selection;
        const coords = currentEditor.view.coordsAtPos(from);
        
        // Ensure menu doesn't overflow horizontally right
        const leftPos = Math.min(Math.max(8, coords.left), window.innerWidth - 320);
        
        const spaceBelow = window.innerHeight - coords.bottom;
        const spaceAbove = coords.top;

        if (spaceBelow < 320 && spaceAbove > spaceBelow) {
          // Position above the cursor using fixed positioning
          setMenuPosition({
            bottom: window.innerHeight - coords.top + 8,
            left: leftPos
          });
        } else {
          // Position below the cursor using fixed positioning
          setMenuPosition({
            top: coords.bottom + 8,
            left: leftPos
          });
        }
      } catch (e) {
        setMenuPosition(null);
      }
    } else {
      setMenuPosition(null);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      BannerNode,
      ToggleNode,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: plain
          ? "cursor-text before:content-[attr(data-placeholder)] before:absolute before:top-1 before:left-0 before:text-slate-400 before:opacity-60 before:pointer-events-none"
          : "cursor-text before:content-[attr(data-placeholder)] before:absolute before:top-[14px] before:left-4 before:text-slate-400 before:opacity-60 before:pointer-events-none",
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: toolbar
          ? `prose prose-sm dark:prose-invert min-h-[190px] w-full rounded-b-[8px] border border-t-0 border-input bg-background px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:outline-none ${editableBlockClasses}`
          : plain
            ? `prose prose-sm dark:prose-invert min-h-[180px] w-full border-0 bg-transparent px-0 py-1 text-[16px] shadow-none focus-visible:outline-none focus:outline-none ${editableBlockClasses}`
            : `prose prose-sm dark:prose-invert min-h-[180px] w-full rounded-[8px] border border-slate-200 bg-slate-50/60 px-4 py-5 text-[15px] shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] ${editableBlockClasses}`,
      },
      handleKeyDown(view, event) {
        if (slashQuery !== null) {
          if (event.key === "ArrowDown") {
            setSelectedCommandIndex((prev) => {
              const next = prev + 2;
              if (next < allVisibleCommands.length) return next;
              const nextRow = prev + 1;
              if (nextRow < allVisibleCommands.length) return nextRow;
              return 0;
            });
            return true;
          }
          if (event.key === "ArrowUp") {
            setSelectedCommandIndex((prev) => {
              const prevRow = prev - 2;
              if (prevRow >= 0) return prevRow;
              const prevItem = prev - 1;
              if (prevItem >= 0) return prevItem;
              return allVisibleCommands.length - 1;
            });
            return true;
          }
          if (event.key === "ArrowRight") {
            setSelectedCommandIndex((prev) => (prev + 1) % allVisibleCommands.length);
            return true;
          }
          if (event.key === "ArrowLeft") {
            setSelectedCommandIndex((prev) => (prev - 1 + allVisibleCommands.length) % allVisibleCommands.length);
            return true;
          }
          if (event.key === "Enter") {
            if (allVisibleCommands[selectedCommandIndex]) {
              runCommand(allVisibleCommands[selectedCommandIndex].command);
              return true;
            }
          }
          if (event.key === "Escape") {
            setSlashQuery(null);
            return true;
          }
        }

        if (bannerInsertRange !== null) {
          if (event.key === "ArrowDown") {
            setSelectedBannerIndex((prev) => {
              const next = prev + 2;
              if (next < bannerColors.length) return next;
              const nextRow = prev + 1;
              if (nextRow < bannerColors.length) return nextRow;
              return 0;
            });
            return true;
          }
          if (event.key === "ArrowUp") {
            setSelectedBannerIndex((prev) => {
              const prevRow = prev - 2;
              if (prevRow >= 0) return prevRow;
              const prevItem = prev - 1;
              if (prevItem >= 0) return prevItem;
              return bannerColors.length - 1;
            });
            return true;
          }
          if (event.key === "ArrowRight") {
            setSelectedBannerIndex((prev) => (prev + 1) % bannerColors.length);
            return true;
          }
          if (event.key === "ArrowLeft") {
            setSelectedBannerIndex((prev) => (prev - 1 + bannerColors.length) % bannerColors.length);
            return true;
          }
          if (event.key === "Enter") {
            if (bannerColors[selectedBannerIndex]) {
              insertBanner(bannerColors[selectedBannerIndex].value);
              return true;
            }
          }
          if (event.key === "Escape") {
            setBannerInsertRange(null);
            return true;
          }
        }

        if (mentionQuery !== null && people !== undefined) {
          if (event.key === "ArrowDown") {
            setSelectedMentionIndex((prev) => (prev + 1 < filteredPeople.length ? prev + 1 : 0));
            return true;
          }
          if (event.key === "ArrowUp") {
            setSelectedMentionIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredPeople.length - 1));
            return true;
          }
          if (event.key === "Enter") {
            if (filteredPeople[selectedMentionIndex]) {
              insertMention(filteredPeople[selectedMentionIndex]);
              return true;
            }
          }
          if (event.key === "Escape") {
            setMentionQuery(null);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
      syncTriggerMenus(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncTriggerMenus(currentEditor);
    },
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === content) return;
    editor.commands.setContent(content || "", { emitUpdate: false });
  }, [content, editor]);

  const filteredPeople = useMemo(() => {
    const query = (mentionQuery ?? "").trim().toLowerCase();
    const availablePeople = people ?? [];
    if (!query) return availablePeople;
    return availablePeople.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query),
    );
  }, [mentionQuery, people]);

  if (!editor) return null;

  const removeActiveTrigger = (query: string) => {
    const cursor = editor.state.selection.from;
    return {
      from: Math.max(1, cursor - query.length - 1),
      to: cursor,
    };
  };

  const runCommand = (command: CommandName) => {
    if (slashQuery === null) return;
    const activeTriggerRange = removeActiveTrigger(slashQuery);

    if (command === "banner") {
      setBannerInsertRange(activeTriggerRange);
      setSlashQuery(null);
      return;
    }

    const chain = editor.chain().focus().deleteRange(activeTriggerRange);

    switch (command) {
      case "checklist":
        chain.toggleTaskList().run();
        break;
      case "paragraph":
        chain.setParagraph().run();
        break;
      case "heading1":
        chain.setHeading({ level: 1 }).run();
        break;
      case "heading2":
        chain.setHeading({ level: 2 }).run();
        break;
      case "heading3":
        chain.setHeading({ level: 3 }).run();
        break;
      case "heading4":
        chain.setHeading({ level: 4 }).run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "toggleList":
        if (editor.isActive("toggleBlock")) {
          chain.lift("toggleBlock").run();
        } else {
          chain.wrapIn("toggleBlock").run();
        }
        break;
    }

    setSlashQuery(null);
  };

  const insertBanner = (color: BannerColor) => {
    if (!bannerInsertRange) return;
    editor
      .chain()
      .focus()
      .deleteRange(bannerInsertRange)
      .insertContent({
        type: "banner",
        attrs: { color },
        content: [{ type: "paragraph" }],
      })
      .run();
    setBannerInsertRange(null);
  };

  const insertMention = (person: RichTextPerson) => {
    if (mentionQuery === null) return;
    editor
      .chain()
      .focus()
      .deleteRange(removeActiveTrigger(mentionQuery))
      .insertContent(`@${person.name} `)
      .run();
    setMentionQuery(null);
  };

  const normalizedSlashQuery = (slashQuery ?? "").toLowerCase().replace(/s$/, "");
  const visibleSuggestionCommands = suggestionCommands.filter((item) =>
    item.label.toLowerCase().includes(normalizedSlashQuery),
  );
  const visibleTextCommands = textCommands.filter((item) =>
    item.label.toLowerCase().includes(normalizedSlashQuery),
  );
  const allVisibleCommands = [
    ...visibleSuggestionCommands,
    ...visibleTextCommands
  ];

  const renderCommandButton = (item: (typeof textCommands)[number], globalIndex: number) => {
    const Icon = item.icon;
    const isSelected = globalIndex === selectedCommandIndex;
    return (
      <button
        key={`${item.command}-${item.label}`}
        type="button"
        data-active={isSelected}
        onMouseEnter={() => setSelectedCommandIndex(globalIndex)}
        onMouseDown={(event) => {
          event.preventDefault();
          runCommand(item.command);
        }}
        className={`flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left text-[14px] text-slate-800 transition-colors focus-visible:outline-none dark:text-slate-100 ${
          isSelected
            ? "bg-slate-100 dark:bg-white/10 ring-1 ring-slate-300 dark:ring-white/20 font-medium"
            : "hover:bg-slate-50 dark:hover:bg-white/5"
        }`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="group relative flex w-full flex-col">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-1 rounded-t-[8px] border border-input bg-muted/40 p-1.5 transition-colors">
        <Toggle
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <div className="mx-1 h-4 w-px bg-border" />
        <Toggle
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0 font-bold"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <div className="mx-1 h-4 w-px bg-border" />
        <Toggle
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        </div>
      )}
      <EditorContent editor={editor} />

      {bannerInsertRange !== null && isMounted && createPortal(
        <div ref={bannerListRef} className="fixed z-[9999] max-h-[390px] w-full max-w-[420px] overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#202024]"
             style={{ top: menuPosition?.top, bottom: menuPosition?.bottom, left: menuPosition?.left }}>
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Choose banner color</p>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setBannerInsertRange(null)}
              className="flex size-7 items-center justify-center rounded-[6px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close banner colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {bannerColors.map((item, idx) => {
              const isSelected = idx === selectedBannerIndex;
              return (
                <button
                  key={item.value}
                  type="button"
                  data-active={isSelected}
                  onMouseEnter={() => setSelectedBannerIndex(idx)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertBanner(item.value);
                  }}
                  className={`flex items-center gap-3 rounded-[8px] px-2 py-2.5 text-left text-sm text-slate-800 transition-colors focus-visible:outline-none dark:text-slate-100 ${
                    isSelected
                      ? "bg-slate-100 dark:bg-white/10 ring-1 ring-slate-300 dark:ring-white/20 font-medium"
                      : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                    <Bookmark className="size-4" fill={item.swatch} color={item.swatch} />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {slashQuery !== null && isMounted && createPortal(
        <div ref={commandListRef}
          className="fixed z-[9999] max-h-[390px] w-full max-w-[320px] overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#202024]"
          style={{ top: menuPosition?.top, bottom: menuPosition?.bottom, left: menuPosition?.left }}
        >
          {visibleSuggestionCommands.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Suggestions
              </p>
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {visibleSuggestionCommands.map((item, idx) => renderCommandButton(item, idx))}
              </div>
            </div>
          )}
          {visibleTextCommands.length > 0 && (
            <div className={visibleSuggestionCommands.length > 0 ? "mt-3" : ""}>
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Text
              </p>
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {visibleTextCommands.map((item, idx) => renderCommandButton(item, visibleSuggestionCommands.length + idx))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {people !== undefined && mentionQuery !== null && slashQuery === null && isMounted && createPortal(
        <div ref={mentionListRef}
          className="fixed z-[9999] w-full max-w-[320px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#202024]"
          style={{ top: menuPosition?.top, bottom: menuPosition?.bottom, left: menuPosition?.left }}
        >
          <div className="border-b border-slate-200 px-4 pt-3 dark:border-white/10">
            <div className="inline-flex items-center gap-2 border-b-2 border-slate-900 pb-2 text-[14px] font-semibold text-slate-900 dark:border-white dark:text-white">
              <AtSign className="size-4" /> People
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              People
            </p>
            {filteredPeople.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-slate-500">No members found</p>
            ) : (
              <div className="space-y-1">
                {filteredPeople.map((person, idx) => {
                  const initials = person.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isSelected = idx === selectedMentionIndex;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      data-active={isSelected}
                      onMouseEnter={() => setSelectedMentionIndex(idx)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(person);
                      }}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left transition-colors focus-visible:outline-none ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/10 ring-1 ring-slate-300 dark:ring-white/20 font-medium"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {person.name}
                        </span>
                        {person.email && (
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {person.email}
                          </span>
                        )}
                      </span>
                      {person.role && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium capitalize text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {person.role.toLowerCase()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/** Toolbar-free project description surface with shortcut and command support. */
export function ProjectDescriptionEditor(
  props: Omit<RichTextEditorProps, "toolbar">,
) {
  return <RichTextEditor {...props} toolbar={false} />;
}
