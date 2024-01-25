import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CreatorFormatter } from 'dtable-ui-component';
import { isValidEmail, getValueFromPluginConfig } from '../../utils/common-utils';
import pluginContext from '../../plugin-context';

class DtableCreatorFormatter extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isDataLoaded: false,
      collaborator: null,
    };
  }

  componentDidMount() {
    this.calculateCollaboratorData(this.props);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.calculateCollaboratorData(nextProps);
  }

  calculateCollaboratorData = (props) => {
    const { cellValue } = props;
    if (!cellValue) {
      this.setState({ isDataLoaded: true, collaborator: null });
      return;
    }
    this.setState({ isDataLoaded: false, collaborator: null });
    const { collaborators } = window.app.state;
    let collaborator = collaborators && collaborators.find(c => c.email === cellValue);
    if (collaborator) {
      this.setState({ isDataLoaded: true, collaborator });
      return;
    }

    const mediaUrl = getValueFromPluginConfig('mediaUrl');
    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (cellValue === 'anonymous') {
      collaborator = {
        name: 'anonymous',
        avatar_url: defaultAvatarUrl,
      };
      this.setState({ isDataLoaded: true, collaborator });
      return;
    }

    let collaboratorsCache = pluginContext.getCollaboratorsCache();
    collaborator = collaboratorsCache[cellValue];
    if (collaborator) {
      this.setState({ isDataLoaded: true, collaborator });
      return;
    }

    if (!isValidEmail(cellValue)) {
      collaborator = {
        name: cellValue,
        avatar_url: defaultAvatarUrl,
      };
      collaboratorsCache[cellValue] = collaborator;
      this.setState({ isDataLoaded: true, collaborator });
      return;
    }

    this.props.getUserCommonInfo(cellValue).then(res => {
      collaborator = res.data;
      collaboratorsCache[cellValue] = collaborator;
      this.setState({ isDataLoaded: true, collaborator });
    }).catch(() => {
      collaborator = {
        name: cellValue,
        avatar_url: defaultAvatarUrl,
      };
      collaboratorsCache[cellValue] = collaborator;
      this.setState({ isDataLoaded: true, collaborator });
    });
  };

  render() {
    const { cellValue, containerClassName } = this.props;
    const { collaborator, isDataLoaded } = this.state;

    if (!cellValue || !collaborator) return this.props.renderEmptyFormatter();
    if (!isDataLoaded) return this.props.renderEmptyFormatter();
    return (
      <CreatorFormatter
        collaborators={[collaborator]}
        value={cellValue}
        containerClassName={containerClassName}
      />
    );
  }
}

DtableCreatorFormatter.propTypes = {
  cellValue: PropTypes.string,
  containerClassName: PropTypes.string,
  getUserCommonInfo: PropTypes.func,
  renderEmptyFormatter: PropTypes.func,
};

export default DtableCreatorFormatter;
