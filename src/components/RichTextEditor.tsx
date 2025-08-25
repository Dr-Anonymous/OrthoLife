import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import 'tiptap-extension-resizable-image/styles.css';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Heading2, Minus, Strikethrough, Quote, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      BubbleMenu.configure({
        pluginKey: 'imageBubbleMenu',
      }),
      Underline,
      ResizableImage,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl p-4 focus:outline-none min-h-[200px]',
        },
    }
  });

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('post_images')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading image:', error);
        // Consider adding a toast notification here
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(fileName);

      if (publicUrl) {
        editor.chain().focus().setResizableImage({ src: publicUrl }).run();
      }
    } catch (error) {
      console.error('Unexpected error during image upload:', error);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      <div className="p-2 border-b flex items-center flex-wrap gap-1 sticky top-0 z-10 bg-background">
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button onClick={setLink} variant={editor.isActive('link') ? 'secondary' : 'ghost'} size="sm" type="button" title="Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          type="color"
          onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="w-8 h-8 p-1 border rounded"
          title="Text Color"
        />
      </div>
      <EditorContent editor={editor} />
      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey="imageBubbleMenu"
          shouldShow={({ editor, from, to }) => {
            return editor.isActive('resizable-image');
          }}
          className="flex gap-1 p-1 bg-background border rounded-md shadow-md"
        >
          <Button
            onClick={() => editor.chain().focus().updateAttributes('resizable-image', { align: 'left' }).run()}
            variant={editor.isActive('resizable-image', { align: 'left' }) ? 'secondary' : 'ghost'}
            size="sm"
            type="button"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().updateAttributes('resizable-image', { align: 'center' }).run()}
            variant={editor.isActive('resizable-image', { align: 'center' }) ? 'secondary' : 'ghost'}
            size="sm"
            type="button"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().updateAttributes('resizable-image', { align: 'right' }).run()}
            variant={editor.isActive('resizable-image', { align: 'right' }) ? 'secondary' : 'ghost'}
            size="sm"
            type="button"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </BubbleMenu>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
};

export default RichTextEditor;
