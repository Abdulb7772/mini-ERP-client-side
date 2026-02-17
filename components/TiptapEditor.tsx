"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TiptapEditor({ content, onChange, placeholder, disabled = false }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Write your description here...',
      }),
    ],
    content,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[150px] px-4 py-3 text-white',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-600 rounded-lg bg-gray-700 focus-within:ring-2 focus-within:ring-orange-500">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-600 flex-wrap bg-gray-800/50 rounded-t-lg">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('bold')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm italic transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('italic')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm line-through transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('strike')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          S
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          H3
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('bulletList')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('orderedList')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          1. List
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('blockquote')
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          " Quote
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ― HR
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
