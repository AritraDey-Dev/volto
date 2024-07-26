import cx from 'classnames';
import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { setSidebarExpanded } from '@plone/volto/actions';
import { Icon } from '@plone/volto/components';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import configSVG from '@plone/volto/icons/configuration.svg';
import { Button } from 'semantic-ui-react';

const messages = defineMessages({
  shrinkSidebar: {
    id: 'Shrink sidebar',
    defaultMessage: 'Shrink sidebar',
  },
  expandSidebar: {
    id: 'Expand sidebar',
    defaultMessage: 'Expand sidebar',
  },
});

export const SidebarToggleButton = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const sidebarExpanded = useSelector(
    (state) => state.sidebar.expanded ?? true,
  );

  return (
    <Plug
      pluggable="main.toolbar.bottom"
      id="sidebar-toggle-button"
      dependencies={[sidebarExpanded]}
      order={-1}
    >
      <Button
        className={cx('settings', {
          'sidebar-expanded': sidebarExpanded,
        })}
        // TODO: The below should set `aria-pressed`, but it doesn't for some reason :(
        active={sidebarExpanded}
        aria-label={
          sidebarExpanded
            ? intl.formatMessage(messages.shrinkSidebar)
            : intl.formatMessage(messages.expandSidebar)
        }
        onClick={() => {
          dispatch(setSidebarExpanded(!sidebarExpanded));
        }}
      >
        <div aria-hidden="true" focusable="false">
          <Icon name={configSVG} />
        </div>
      </Button>
    </Plug>
  );
};

export default SidebarToggleButton;