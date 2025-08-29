import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { CustomImage } from './CustomImage';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Heading2, Minus, Strikethrough, Quote, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Pilcrow, Table as TableIcon, Trash, CornerUpLeft, CornerUpRight, Columns, Rows } from 'lucide-react';
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
      CustomImage,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
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
        editor.chain().focus().setImage({ src: publicUrl }).run();
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
      <div className="p-2 border-b flex items-center flex-wrap gap-1 sticky top-[104px] bg-background z-40">
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
        <Button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        {editor.can().deleteTable() && <Button
          onClick={() => editor.chain().focus().deleteTable().run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Delete Table"
        >
          <Trash className="h-4 w-4" />
        </Button>}
        {editor.can().addColumnAfter() && <Button
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          variant={'ghost'}
          size="sm"
  type="button"
          title="Add Column After"
        >
          <Columns className="h-4 w-4" />
        </Button>}
        {editor.can().addRowAfter() && <Button
          onClick={() => editor.chain().focus().addRowAfter().run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Add Row After"
        >
          <Rows className="h-4 w-4" />
        </Button>}
        {editor.can().deleteColumn() && <Button
          onClick={() => editor.chain().focus().deleteColumn().run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Delete Column"
        >
          <Columns className="h-4 w-4 text-red-500" />
        </Button>}
        {editor.can().deleteRow() && <Button
          onClick={() => editor.chain().focus().deleteRow().run()}
          variant={'ghost'}
          size="sm"
          type="button"
          title="Delete Row"
        >
          <Rows className="h-4 w-4 text-red-500" />
        </Button>}
        <input
          type="color"
          onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="w-8 h-8 p-1 border rounded"
          title="Text Color"
        />
      </div>
      <EditorContent editor={editor} />
      {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} pluginKey="imageBubbleMenu" shouldShow={({ editor, from, to }) => editor.isActive('custom-image')}>
        <div className="p-2 bg-background border rounded-md shadow-lg flex items-center gap-2">
          <Button onClick={() => editor.chain().focus().setImage({ align: 'left' }).run()} variant={editor.isActive('custom-image', { align: 'left' }) ? 'secondary' : 'ghost'} size="sm" type="button" title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button onClick={() => editor.chain().focus().setImage({ align: 'center' }).run()} variant={editor.isActive('custom-image', { align: 'center' }) ? 'secondary' : 'ghost'} size="sm" type="button" title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button onClick={() => editor.chain().focus().setImage({ align: 'right' }).run()} variant={editor.isActive('custom-image', { align: 'right' }) ? 'secondary' : 'ghost'} size="sm" type="button" title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => editor.chain().focus().setImage({ display: editor.getAttributes('custom-image').display === 'block' ? 'inline-block' : 'block' }).run()} variant={editor.isActive('custom-image', { display: 'inline-block' }) ? 'secondary' : 'ghost'} size="sm" type="button" title="Toggle Display">
            <Pilcrow className="h-4 w-4" />
          </Button>
          <input
            type="range"
            min="25"
            max="100"
            value={parseInt(editor.getAttributes('custom-image').width?.replace('%', '')) || 100}
            onChange={(e) => editor.chain().focus().setImage({ width: `${e.target.value}%` }).run()}
            className="w-24"
          />
        </div>
      </BubbleMenu>}
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
