import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import intl from 'react-intl-universal';
import PropTypes from 'prop-types';
import { FileItemFormatter } from 'dtable-ui-component';
import { bytesToSize } from '../../../utils/common-utils';

import '../../../assets/css/file-enlarge-formatter.css';

class FileEnlargeFormatter extends Component {

  toggle = () => {
    this.props.closeEnlargeFormatter();
  }

  downloadFile = (event, url) => {
    event.stopPropagation();
    let seafileFileIndex = url.indexOf('seafile-connector');
    if (seafileFileIndex > -1) return;
    window.location.href = url + '?dl=1';
  }

  render() {
    const { value } = this.props;

    return (
      <Modal isOpen={true} toggle={this.toggle} className="file-enlarge-formatter-dialog">
        <ModalHeader toggle={this.toggle}>{intl.get('All_files')}</ModalHeader>
        <ModalBody style={{padding: 0}} className="file-enlarge-formatter-body">
          {Array.isArray(value) && value.length > 0 && value.map((item, index) => {
            const { url, type, size, name } = item;
            return (
              <div
                key={`${url}-${index}`}
                className="enlarge-file-item"
              >
                <div className="enlarge-file-item-icon">
                  <FileItemFormatter file={item} />
                </div>
                <div className="enlarge-file-item-info">
                  <div className={`enlarge-file-item-name text-truncate ${type === 'dir' ? 'enlarge-file-item-name-height' : ''}`} >
                    <span>{name}</span>
                  </div>
                  {size > -1 &&
                    <div className="enlarge-file-item-size">{bytesToSize(size)}</div>
                  }
                </div>
                {(type === 'file' && url.indexOf('seafile-connector') === -1) && (
                  <div className="enlarge-file-item-operation" onClick={(event) => this.downloadFile(event, url)}>
                    <i className="dtable-font dtable-icon-download file-download-icon"></i>
                  </div>
                )}
              </div>
            );
          })}
        </ModalBody>
      </Modal>
    );
  }
}

FileEnlargeFormatter.propTypes = {
  value: PropTypes.array,
  closeEnlargeFormatter: PropTypes.func.isRequired,
};

export default FileEnlargeFormatter;
