import React from 'react';
import ImageWidget from './ImageWidget';
import WidgetStory from './story';

export const Default = WidgetStory.bind({
  props: { id: 'image_widget', title: 'Image', data: {}, properties: {} },
  widget: ImageWidget,
});

export const Inline = WidgetStory.bind({
  props: {
    id: 'image_widget',
    title: 'Image',
    data: {},
    properties: {},
    inline: true,
  },
  widget: ImageWidget,
});

export default {
  title: 'Edit Widgets/Image',
  component: ImageWidget,
  decorators: [
    (Story) => (
      <div className="ui segment form attached" style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {},
};
