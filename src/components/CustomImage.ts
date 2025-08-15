import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';

export const CustomImage = Image.extend({
  name: 'custom-image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
      },
      align: {
        default: 'center',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { align, width } = HTMLAttributes;

    const style: { [key: string]: string } = {};
    if (align === 'left') style['margin-right'] = 'auto';
    if (align === 'right') style['margin-left'] = 'auto';
    if (align === 'center') {
      style['margin-left'] = 'auto';
      style['margin-right'] = 'auto';
    }
    
    // a block element is required for margin auto to work
    style['display'] = 'block';
    
    if (width) {
        style['width'] = width;
    }

    const attrs = mergeAttributes(this.options.HTMLAttributes, {
        style: Object.entries(style).map(([key, value]) => `${key}: ${value}`).join('; '),
    }, HTMLAttributes);

    return ['img', attrs];
  },
});
