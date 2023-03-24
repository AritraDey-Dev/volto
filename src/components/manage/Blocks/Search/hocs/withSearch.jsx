import React from 'react';
import { useSelector } from 'react-redux';
import qs from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';

import { resolveExtension } from '@plone/volto/helpers/Extensions/withBlockExtensions';
import config from '@plone/volto/registry';

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

const SEARCH_ENDPOINT_FIELDS = [
  'SearchableText',
  'b_size',
  'limit',
  'sort_on',
  'sort_order',
];

const PAQO = 'plone.app.querystring.operation';

/**
 * Based on URL state, gets an initial internal state for the search
 *
 * @function getInitialState
 *
 */
function getInitialState(data, facets, searchText, id) {
  const {
    types: facetWidgetTypes,
  } = config.blocks.blocksConfig.search.extensions.facetWidgets;
  const facetSettings = data?.facets || [];

  return {
    query: [
      ...(data.query?.query || []),
      ...(facetSettings || [])
        .map((facet) => {
          if (!facet?.field) return null;

          const { valueToQuery } = resolveExtension(
            'type',
            facetWidgetTypes,
            facet,
          );

          const name = facet.field.value;
          const value = facets[name];

          return valueToQuery({ value, facet });
        })
        .filter((f) => !!f),
      ...(searchText
        ? [
            {
              i: 'SearchableText',
              o: 'plone.app.querystring.operation.string.contains',
              v: searchText,
            },
          ]
        : []),
    ],
    sort_on: data.query?.sort_on,
    sort_order: data.query?.sort_order,
    b_size: data.query?.b_size,
    limit: data.query?.limit,
    block: id,
  };
}

/**
 * "Normalizes" the search state to something that's serializable
 * (for querying) and used to compute data for the ListingBody
 *
 * @function normalizeState
 *
 */
function normalizeState({
  query, // base query
  facets, // facet values
  id, // block id
  searchText, // SearchableText
  sortOn,
  sortOrder,
  facetSettings, // data.facets extracted from block data
}) {
  const {
    types: facetWidgetTypes,
  } = config.blocks.blocksConfig.search.extensions.facetWidgets;

  const params = {
    query: [
      ...(query.query || []),
      ...(facetSettings || []).map((facet) => {
        if (!facet?.field) return null;

        const { valueToQuery } = resolveExtension(
          'type',
          facetWidgetTypes,
          facet,
        );

        const name = facet.field.value;
        const value = facets[name];

        return valueToQuery({ value, facet });
      }),
    ].filter((o) => !!o),
    sort_on: sortOn || query.sort_on,
    sort_order: sortOrder || query.sort_order,
    b_size: query.b_size,
    limit: query.limit,
    block: id,
  };

  // TODO: need to check if SearchableText facet is not already in the query
  // Ideally the searchtext functionality should be restructured as being just
  // another facet
  params.query = params.query.reduce(
    // Remove SearchableText from query
    (acc, kvp) => (kvp.i === 'SearchableText' ? acc : [...acc, kvp]),
    [],
  );
  if (searchText) {
    params.query.push({
      i: 'SearchableText',
      o: 'plone.app.querystring.operation.string.contains',
      v: searchText,
    });
  }

  return params;
}

const getSearchFields = (searchData) => {
  return Object.assign(
    {},
    ...SEARCH_ENDPOINT_FIELDS.map((k) => {
      return searchData[k] ? { [k]: searchData[k] } : {};
    }),
    searchData.query ? { query: serializeQuery(searchData['query']) } : {},
  );
};

/**
 * A HOC that will mirror the search block state to a hash location
 */
const useHashState = () => {
  const location = useLocation();
  const history = useHistory();

  const oldState = React.useMemo(() => {
    return {
      ...qs.parse(location.search),
      ...qs.parse(location.hash),
    };
  }, [location.hash, location.search]);

  // This creates a shallow copy. Why is this needed?
  const current = Object.assign(
    {},
    ...Array.from(Object.keys(oldState)).map((k) => ({ [k]: oldState[k] })),
  );

  const setSearchData = React.useCallback(
    (searchData) => {
      const newParams = qs.parse(location.hash);

      let changed = false;

      Object.keys(searchData)
        .sort()
        .forEach((k) => {
          if (searchData[k]) {
            newParams[k] = searchData[k];
            if (oldState[k] !== searchData[k]) {
              changed = true;
            }
          }
        });

      if (changed) {
        history.push({
          hash: qs.stringify(newParams),
        });
      }
    },
    [history, oldState, location.hash],
  );

  return [current, setSearchData];
};

/**
 * A hook to make it possible to switch disable mirroring the search block
 * state to the window location. When using the internal state we "start from
 * scratch", as it's intended to be used in the edit page.
 */
const useSearchBlockState = (uniqueId, isEditMode) => {
  const [hashState, setHashState] = useHashState();
  const [internalState, setInternalState] = React.useState({});

  return isEditMode
    ? [internalState, setInternalState]
    : [hashState, setHashState];
};

// Simple compress/decompress the state in URL by replacing the lengthy string
const deserializeQuery = (q = []) => {
  return JSON.parse(q)?.map((kvp) => ({
    ...kvp,
    o: kvp.o.replace(/^paqo/, PAQO),
  }));
};
const serializeQuery = (q) => {
  return JSON.stringify(
    q?.map((kvp) => ({ ...kvp, o: kvp.o.replace(PAQO, 'paqo') })),
  );
};

const getSort = (args) => {
  const { toSortOn, toSortOrder, sortOn, sortOrder } = args;
  return {
    sortOn: toSortOn || sortOn,
    sortOrder: toSortOrder || sortOrder,
  };
};

const extractFacets = (data, query, locationSearchData) => {
  const configuredFacets =
    data.facets?.map((facet) => facet?.field?.value) || [];
  const multiFacets = data.facets
    ?.filter((facet) => facet?.multiple)
    .map((facet) => facet?.field?.value);

  return Object.assign(
    {},
    ...query.map(({ i, v }) => ({ [i]: v })), // TODO: the 'o' should be kept. This would be a major refactoring of the facets

    // support for simple filters like ?Subject=something
    // TODO: since the move to hash params this is no longer working.
    // We'd have to treat the location.search and manage it just like the
    // hash, to support it. We can read it, but we'd have to reset it as
    // well, so at that point what's the difference to the hash?
    ...configuredFacets.map((f) =>
      locationSearchData[f]
        ? {
            [f]:
              multiFacets.indexOf(f) > -1
                ? [locationSearchData[f]]
                : locationSearchData[f],
          }
        : {},
    ),
  );
};

const withSearch = (options) => (WrappedComponent) => {
  const { inputDelay = 1000 } = options || {};

  function WithSearch(props) {
    const { data, id, editable = false } = props;

    const [locationSearchData, setLocationSearchData] = useSearchBlockState(
      id,
      editable,
    );

    const query = deserializeQuery(locationSearchData.query);
    const searchTextFromUrl =
      locationSearchData.SearchableText ||
      query.find(({ i }) => i === 'SearchableText')?.v ||
      '';

    // TODO: refactor, should use only useLocationStateManager()!!!
    const [searchText, setSearchText] = React.useState(searchTextFromUrl);

    const defaultFacets = extractFacets(data, query, locationSearchData);
    const [facets, setFacets] = React.useState(defaultFacets);

    const [sortOn, setSortOn] = React.useState(data?.query?.sort_on);
    const [sortOrder, setSortOrder] = React.useState(data?.query?.sort_order);

    const [searchData, setSearchData] = React.useState(
      getInitialState(data, facets, searchTextFromUrl, id),
    );

    const timeoutRef = React.useRef();
    const facetSettings = data?.facets;

    const onTriggerSearch = React.useCallback(
      (args) => {
        const { toSearchText, toSearchFacets, toSortOn, toSortOrder } = args;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(
          () => {
            const sortOnData = getSort({ ...args, sortOn, sortOrder });
            const searchData = normalizeState({
              id,
              query: data.query || {},
              facets: toSearchFacets || facets,
              searchText: toSearchText,
              ...sortOnData,
              facetSettings,
            });

            if (toSearchFacets) setFacets(toSearchFacets);
            if (sortOnData.sortOn !== sortOn) {
              setSortOn(toSortOn);
            }
            if (sortOnData.sortOrder !== toSortOrder) {
              setSortOrder(toSortOrder);
            }

            setSearchData(searchData); // store internal state, can be passed to children
            setLocationSearchData(getSearchFields(searchData)); // store in URL
          },
          toSearchFacets ? inputDelay / 3 : inputDelay,
        );
      },
      [
        data.query,
        facets,
        id,
        setLocationSearchData,
        sortOn,
        sortOrder,
        facetSettings,
      ],
    );

    const querystringResults = useSelector(
      (state) => state.querystringsearch.subrequests,
    );
    const totalItems =
      querystringResults[id]?.total || querystringResults[id]?.items?.length;

    return (
      <WrappedComponent
        {...props}
        searchData={searchData}
        facets={facets}
        setFacets={setFacets}
        setSortOn={setSortOn}
        setSortOrder={setSortOrder}
        sortOn={sortOn}
        sortOrder={sortOrder}
        searchedText={searchTextFromUrl}
        searchText={searchText}
        setSearchText={setSearchText}
        onTriggerSearch={onTriggerSearch}
        totalItems={totalItems}
      />
    );
  }
  WithSearch.displayName = `WithSearch(${getDisplayName(WrappedComponent)})`;

  return WithSearch;
};

export default withSearch;
