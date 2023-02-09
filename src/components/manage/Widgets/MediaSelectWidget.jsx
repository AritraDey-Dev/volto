import React, { useEffect, useState } from 'react';
import { Button, Dimmer, Loader, Message } from 'semantic-ui-react';
import { useIntl, defineMessages } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import loadable from '@loadable/component';
import { toast } from 'react-toastify';

import useLinkEditor from '@plone/volto/components/manage/AnchorPlugin/useLinkEditor';
import withObjectBrowser from '@plone/volto/components/manage/Sidebar/ObjectBrowser';

import {
  flattenToAppURL,
  getBaseUrl,
  isInternalURL,
} from '@plone/volto/helpers';
import { createContent } from '@plone/volto/actions';
import { readAsDataURL } from 'promise-file-reader';
import {
  FormFieldWrapper,
  Icon,
  UniversalLink,
  Toast,
} from '@plone/volto/components';

import imageBlockSVG from '@plone/volto/components/manage/Blocks/Image/block-image.svg';
import clearSVG from '@plone/volto/icons/clear.svg';
import navTreeSVG from '@plone/volto/icons/nav.svg';
import linkSVG from '@plone/volto/icons/link.svg';
import uploadSVG from '@plone/volto/icons/upload.svg';
import openinnewtabSVG from '@plone/volto/icons/openinnewtab.svg';

const Dropzone = loadable(() => import('react-dropzone'));

export const ImageToolbar = ({ className, data, id, onChange, selected }) => (
  <div className="image-upload-widget-toolbar">
    <Button.Group>
      <Button icon basic onClick={() => onChange(id, null)}>
        <Icon className="circled" name={clearSVG} size="24px" color="#e40166" />
      </Button>
    </Button.Group>
  </div>
);

const messages = defineMessages({
  addImage: {
    id: 'addImage',
    defaultMessage: 'Browse the site, drop an image, or use an URL',
  },
  pickAnImage: {
    id: 'pickAnImage',
    defaultMessage: 'Pick an existing image',
  },
  uploadAnImage: {
    id: 'uploadAnImage',
    defaultMessage: 'Upload an image from your computer',
  },
  linkAnImage: {
    id: 'linkAnImage',
    defaultMessage: 'Enter a URL to an image',
  },
  uploadingImage: {
    id: 'uploadingImage',
    defaultMessage: 'Uploading image',
  },
});

const MediaSelectWidget = (props) => {
  const {
    id,
    pathname,
    onChange,
    onFocus,
    openObjectBrowser,
    value,
    imageSize = 'teaser',
    selected = true,
    inline,
    handlesErrors = true,
  } = props;
  console.log(props);

  const intl = useIntl();
  const linkEditor = useLinkEditor();
  const location = useLocation();
  const dispatch = useDispatch();
  const contextUrl = pathname ?? location.pathname;

  const [dragging, setDragging] = useState(false);

  const requestId = `image-upload-${id}`;

  const uploadState = useSelector((state) => {
    return state.content.subrequests['image-upload-url'];
  });
  const uploadError = useSelector((state) => {
    return state.content.subrequests?.['image-upload-url']?.error;
  });

  useEffect(() => {
    if (uploadError && handlesErrors) {
      toast.error(
        <>
          <Toast
            error
            title="Upload error:"
            content={uploadState?.error?.response.body.message}
          />
        </>,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadError]);

  const handleUpload = React.useCallback(
    (eventOrFile) => {
      eventOrFile.target && eventOrFile.stopPropagation();
      const file = eventOrFile.target
        ? eventOrFile.target.files[0]
        : eventOrFile[0];
      readAsDataURL(file).then((fileData) => {
        const fields = fileData.match(/^data:(.*);(.*),(.*)$/);
        dispatch(
          createContent(
            getBaseUrl(contextUrl),
            {
              '@type': 'Image',
              title: file.name,
              image: {
                data: fields[3],
                encoding: fields[2],
                'content-type': fields[1],
                filename: file.name,
              },
            },
            requestId,
          ),
        ).then((resp) => {
          if (resp) {
            onChange(id, resp['@id']);
          }
        });
      });
    },
    [dispatch, contextUrl, id, requestId, onChange],
  );

  const onDragEnter = React.useCallback(() => setDragging(true), []);
  const onDragLeave = React.useCallback(() => setDragging(false), []);

  return value ? (
    <div
      className="image-upload-widget-image"
      onClick={onFocus}
      onKeyDown={onFocus}
      role="toolbar"
    >
      {selected && <ImageToolbar {...props} />}
      <img
        className={props.className}
        src={`${flattenToAppURL(value)}/@@images/image/${imageSize}`}
        alt=""
      />
      <FormFieldWrapper {...props} noForInFieldLabel className="image">
        <div className="image-widget-filepath-preview">
          {value}&nbsp;
          {isInternalURL ? (
            <UniversalLink href={value} openLinkInNewTab>
              <Icon name={openinnewtabSVG} size="16px" />
            </UniversalLink>
          ) : null}
        </div>
      </FormFieldWrapper>
    </div>
  ) : (
    <div
      className="image-upload-widget"
      onClick={onFocus}
      onKeyDown={onFocus}
      role="toolbar"
    >
      {!inline ? (
        <FormFieldWrapper {...props} noForInFieldLabel className="image" />
      ) : null}
      <Dropzone
        noClick
        onDrop={handleUpload}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className="dropzone"
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <Message>
              {dragging && <Dimmer active></Dimmer>}
              {uploadState?.loading && (
                <Dimmer active>
                  <Loader indeterminate>
                    {intl.formatMessage(messages.uploadingImage)}
                  </Loader>
                </Dimmer>
              )}
              <img src={imageBlockSVG} alt="" />
              <div>{intl.formatMessage(messages.addImage)}</div>
              <div className="toolbar-wrapper">
                <div className="toolbar-inner" ref={linkEditor.anchorNode}>
                  <Button.Group>
                    <Button
                      title={intl.formatMessage(messages.pickAnImage)}
                      icon
                      basic
                      onClick={(e) => {
                        onFocus && onFocus();
                        e.preventDefault();
                        openObjectBrowser({
                          mode: 'link',
                          overlay: true,
                          onSelectItem: (url, item) => onChange(id, url, item),
                        });
                      }}
                    >
                      <Icon name={navTreeSVG} size="24px" />
                    </Button>
                  </Button.Group>
                  <Button.Group>
                    <label className="ui button compact basic icon">
                      <Icon name={uploadSVG} size="24px" />
                      <input
                        {...getInputProps({
                          type: 'file',
                          onChange: handleUpload,
                          style: { display: 'none' },
                        })}
                        title={intl.formatMessage(messages.uploadAnImage)}
                      />
                    </label>
                  </Button.Group>
                  <Button.Group>
                    <Button
                      icon
                      basic
                      title={intl.formatMessage(messages.linkAnImage)}
                      onClick={(e) => {
                        !props.selected && onFocus && onFocus();
                        linkEditor.show();
                      }}
                    >
                      <Icon name={linkSVG} circled size="24px" />
                    </Button>
                  </Button.Group>
                </div>
                {linkEditor.anchorNode && (
                  <linkEditor.LinkEditor
                    value={value}
                    onChange={onChange}
                    id={id}
                  />
                )}
              </div>
            </Message>
          </div>
        )}
      </Dropzone>
    </div>
  );
};

export default withObjectBrowser(MediaSelectWidget);
