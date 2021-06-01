import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './dialog/modal-portal';
import NewViewDialog from './dialog/new-view-dialog';
import RenameViewDialog from './dialog/rename-view-dialog';
import DropdownMenu from './dropdownmenu';
import tabStyles from '../css/view-tabs.module.css';

const propTypes = {
  settings: PropTypes.array,
  selectedViewIdx: PropTypes.number,
  onAddView: PropTypes.func,
  onRenameView: PropTypes.func,
  onDeleteView: PropTypes.func,
  onSelectView: PropTypes.func
};

class ViewTabs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowNewViewDialog: false,
      isShowRenameViewDialog: false
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideViewDropdown);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideViewDropdown);
  }
  
  onDropdownToggle = (evt) => {
    evt.nativeEvent.stopImmediatePropagation();
    let { top, left, height } = this.btnViewDropdown.parentNode.getBoundingClientRect();
    this.setState({
      isShowViewDropdown: !this.state.isShowViewDropdown,
      dropdownMenuPosition: {
        top: top + height - 3,
        left
      }
    });
  }


  onHideViewDropdown = () => {
    if (this.state.isShowViewDropdown) {
      this.setState({isShowViewDropdown: false});
    }
  }

  onNewViewToggle = () => {
    this.setState({isShowNewViewDialog: !this.state.isShowNewViewDialog});
  }

  onNewViewCancel = () => {
    this.setState({isShowNewViewDialog: false});
  }

  onSelectView = (index) => {
    if (index === this.props.selectedViewIdx) {
      return;
    }
    this.props.onSelectView(index);
  }

  onAddView = (viewName) => {
    this.props.onAddView(viewName);
    this.onNewViewToggle();
  }

  onRenameViewToggle = () => {
    this.setState({isShowRenameViewDialog: !this.state.isShowRenameViewDialog});
  }

  hideRenameViewDialog = () => {
    this.setState({isShowRenameViewDialog: false});
  }

  renderTabs = () => {
    const { settings, selectedViewIdx } = this.props;
    let tabs = [];
    if (settings) {
      const { isShowViewDropdown, dropdownMenuPosition } = this.state;
      tabs = settings.map((item, index) => {
        const isSelected = selectedViewIdx === index;
        return (
          <div key={item.id} onClick={() => this.onSelectView(index)} className={`${tabStyles['view-item']}`}>
            <div className={`${tabStyles['view-item-content']} ${isSelected && tabStyles['tab-item-active']}`}>
              <div className="view-name">{item.name}</div>
              {
                isSelected &&
                <div onClick={this.onDropdownToggle} ref={ref => this.btnViewDropdown = ref} className={`${tabStyles['btn-view-dropdown']}`}>
                  <i className={`${tabStyles['icon']} dtable-font dtable-icon-drop-down`}></i>
                  {isShowViewDropdown &&
                    <ModalPortal>
                      <DropdownMenu
                        dropdownMenuPosition={dropdownMenuPosition}
                        options={
                          <React.Fragment>
                            <button className="dropdown-item" onClick={() => this.onRenameViewToggle(index)}>
                              <i className="item-icon dtable-font dtable-icon-rename"></i>
                              <span className="item-text">{('重命名视图')}</span>
                            </button>
                            {settings.length > 1 &&
                              <button className="dropdown-item" onClick={() => this.props.onDeleteView(index)}>
                                <i className="item-icon dtable-font dtable-icon-delete"></i>
                                <span className="item-text">{('删除视图')}</span>
                              </button>
                            }
                          </React.Fragment>
                        }
                      />
                    </ModalPortal>
                  }
                </div>
              }
            </div>
          </div>
        );
      });
    }

    return tabs;
  }

  render() {
    const { isShowNewViewDialog, isShowRenameViewDialog } = this.state;
    const { settings, selectedViewIdx } = this.props;
    return (
      <div className={tabStyles['tabs-container']}>
        <div className={tabStyles["views-tabs-scroll"]} ref={ref => this.viewsTabsScroll = ref}>
          <div className={`${tabStyles['views']} d-inline-flex`}>
            {this.renderTabs()}
          </div>
        </div>
        <div className={tabStyles['btn-add-view']} key={'btn-add-view'} onClick={this.onNewViewToggle}>
          <i className={`${tabStyles['add-map-view-icon']} dtable-font dtable-icon-add-table`}></i>
        </div>
        {isShowNewViewDialog &&
          <NewViewDialog
            onNewViewConfirm={this.onAddView}
            onNewViewCancel={this.onNewViewCancel}
          />
        }
        {isShowRenameViewDialog &&
          <RenameViewDialog
            viewName={settings[selectedViewIdx].name}
            onRenameView={this.props.onRenameView}
            hideRenameViewDialog={this.hideRenameViewDialog}
          />
        }
      </div>
    );
  }
}

ViewTabs.propTypes = propTypes;

export default ViewTabs;
