import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from 'dtable-ui-component';
import NewViewDialog from './dialog/new-view-dialog';
import RenameViewDialog from './dialog/rename-view-dialog';
import DropdownMenu from './dropdownmenu';
import intl from 'react-intl-universal';
import tabStyles from '../css/view-tabs.module.css';

const SCROLL_TYPE = {
  PREV: 'prev',
  NEXT: 'next',
};

const viewTabPropTypes = {
  view: PropTypes.object,
  index: PropTypes.number,
  selectedViewIdx: PropTypes.number,
  setViewItem: PropTypes.func,
  onSelectView: PropTypes.func,
  onDeleteView: PropTypes.func,
  onMoveView: PropTypes.func,
  onRenameViewToggle: PropTypes.func,
  canDelete: PropTypes.bool
};

class ViewTab extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowViewDropdown: false,
      dropdownMenuPosition: {
        top: 0,
        left: 0
      }
    };
    this.enteredCounter = 0;
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideViewDropdown);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideViewDropdown);
  }

  onHideViewDropdown = () => {
    if (this.state.isShowViewDropdown) {
      this.setState({ isShowViewDropdown: false });
    }
  };

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
  };

  onSelectView = (index) => {
    if (index === this.props.selectedViewIdx) {
      return;
    }
    this.props.onSelectView(index);
  };

  onDragStart = (event) => {
    event.stopPropagation();
    let ref = this.itemRef;
    event.dataTransfer.setDragImage(ref, 10, 10);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.props.view.id);
  };

  onDragEnter = (event) => {
    event.stopPropagation();
    this.enteredCounter++;
  };

  onDragOver = (event) => {
    if (event.dataTransfer.dropEffect === 'copy') {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    this.setState({
      dropRelativePosition: event.nativeEvent.offsetX <= event.target.clientWidth / 2 ?
        'before' : 'after'
    });
  };

  onDragLeave = (event) => {
    event.stopPropagation();
    this.enteredCounter--;
    if (this.enteredCounter === 0) {
      this.setState({
        dropRelativePosition: ''
      });
    }
  };

  onDrop = (event) => {
    event.stopPropagation();
    event.preventDefault();

    this.enteredCounter = 0;
    const { dropRelativePosition } = this.state;
    this.setState({
      dropRelativePosition: ''
    });

    const droppedViewID = event.dataTransfer.getData('text/plain');
    const { id } = this.props.view;
    if (droppedViewID === id) {
      return;
    }
    this.props.onMoveView(droppedViewID, id, dropRelativePosition);
  };

  render() {
    const { view, index, selectedViewIdx, canDelete } = this.props;
    const isSelected = selectedViewIdx === index;
    const {
      isShowViewDropdown, dropdownMenuPosition,
      dropRelativePosition
    } = this.state;
    return (
      <div
        ref={ref => this.itemRef = ref}
        draggable="true"
        onDragStart={this.onDragStart}
        onDragEnter={this.onDragEnter}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}
        className={`
          ${tabStyles['view-item']}
          ${dropRelativePosition === 'before' ? tabStyles['view-item-can-drop-before'] : ''}
          ${dropRelativePosition === 'after' ? tabStyles['view-item-can-drop-after'] : ''}
        `}
      >
        <div
          ref={this.props.setViewItem(index)}
          onClick={() => this.onSelectView(index)}
          className={`${tabStyles['view-item-content']} ${isSelected ? tabStyles['tab-item-active'] : ''}`}
        >
          <div className="view-name">{view.name}</div>
          {isSelected &&
          <div onClick={this.onDropdownToggle} ref={ref => this.btnViewDropdown = ref} className={`${tabStyles['btn-view-dropdown']}`}>
            <i className={`${tabStyles['icon']} dtable-font dtable-icon-drop-down`}></i>
            {isShowViewDropdown &&
            <ModalPortal>
              <DropdownMenu
                dropdownMenuPosition={dropdownMenuPosition}
                options={
                  <React.Fragment>
                    <button className="dropdown-item" onClick={this.props.onRenameViewToggle}>
                      <i className="item-icon dtable-font dtable-icon-rename"></i>
                      <span className="item-text">{(intl.get('Rename_view'))}</span>
                    </button>
                    {canDelete &&
                    <button className="dropdown-item" onClick={() => this.props.onDeleteView(index)}>
                      <i className="item-icon dtable-font dtable-icon-delete"></i>
                      <span className="item-text">{intl.get('Delete_view')}</span>
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
  }
}

const propTypes = {
  settings: PropTypes.array,
  selectedViewIdx: PropTypes.number,
  isMobile: PropTypes.bool,
  onAddView: PropTypes.func,
  onRenameView: PropTypes.func,
  onDeleteView: PropTypes.func,
  onMoveView: PropTypes.func,
  onSelectView: PropTypes.func
};

class ViewTabs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowNewViewDialog: false,
      isShowRenameViewDialog: false,
      canScrollPrev: false,
      canScrollNext: false,
      canViewsScroll: true,
    };
    this.views = [];
  }

  componentDidMount() {
    this.initSelectedViewScroll(this.props);
  }

  componentDidUpdate(prevProps) {
    const { settings } = this.props;
    if (!prevProps.settings && settings !== prevProps.settings) {
      this.initSelectedViewScroll(this.props);
    }
  }

  initSelectedViewScroll = (props) => {
    if (this.views.length === 0) {
      return;
    }
    const { selectedViewIdx } = props;
    const { left } = this.views[selectedViewIdx].getBoundingClientRect();
    const { offsetWidth } = this.viewsTabsScroll;
    if (left > offsetWidth) {
      this.viewsTabsScroll.scrollLeft = left - offsetWidth;
    } else {
      this.checkAvailableScrollType();
    }
  };

  checkAvailableScrollType = () => {
    if (this.props.isMobile) {
      return;
    }
    const { canScrollPrev, canScrollNext } = this.state;
    let { offsetWidth, scrollWidth, scrollLeft } = this.viewsTabsScroll;
    let _canScrollPrev = false;
    let _canScrollNext = false;
    if (scrollLeft > 0) {
      _canScrollPrev = true;
    }
    if (scrollLeft + offsetWidth < scrollWidth) {
      _canScrollNext = true;
    }

    if (_canScrollPrev !== canScrollPrev || _canScrollNext !== canScrollNext) {
      this.setState({
        canScrollPrev: _canScrollPrev,
        canScrollNext: _canScrollNext,
      });
    }
  };

  onScrollWithControl = (type) => {
    const { offsetWidth, scrollWidth, scrollLeft } = this.viewsTabsScroll;
    let targetScrollLeft;
    if (type === SCROLL_TYPE.PREV) {
      if (scrollLeft === 0) {
        return;
      }
      targetScrollLeft = scrollLeft - offsetWidth;
      targetScrollLeft = targetScrollLeft > 0 ? targetScrollLeft : 0;
    }

    if (type === SCROLL_TYPE.NEXT) {
      if (scrollLeft + offsetWidth === scrollWidth) {
        return;
      }
      targetScrollLeft = scrollLeft + offsetWidth;
      targetScrollLeft = targetScrollLeft > scrollWidth - offsetWidth ? scrollWidth - offsetWidth : targetScrollLeft;
    }
    if (this.state.canViewsScroll) {
      this.setState({ canViewsScroll: false });
      let timer = null;
      timer = setInterval(() => {
        let step = (targetScrollLeft - scrollLeft) / 10;
        step = step > 0 ? Math.ceil(step) : Math.floor(step);
        this.viewsTabsScroll.scrollLeft = this.viewsTabsScroll.scrollLeft + step;
        if (Math.abs(targetScrollLeft - this.viewsTabsScroll.scrollLeft) <= Math.abs(step)) {
          this.viewsTabsScroll.scrollLeft = targetScrollLeft;
          clearInterval(timer);
          this.setState({ canViewsScroll: true });
        }
      }, 15);
    }
  };

  setViewItem = idx => viewItem => {
    this.views[idx] = viewItem;
  };

  setViewsTabsScroll = () => {
    if (!this.viewsTabsScroll) return;
    let { offsetWidth, scrollWidth } = this.viewsTabsScroll;
    if (scrollWidth > offsetWidth) {
      this.viewsTabsScroll.scrollLeft = scrollWidth - offsetWidth;
    }
  };

  onViewsScroll = () => {
    this.checkAvailableScrollType();
  };

  onNewViewToggle = () => {
    this.setState({ isShowNewViewDialog: !this.state.isShowNewViewDialog });
  };

  onNewViewCancel = () => {
    this.setState({ isShowNewViewDialog: false });
  };

  onAddView = (viewName) => {
    this.props.onAddView(viewName);
    this.onNewViewToggle();
  };

  onRenameViewToggle = () => {
    this.setState({ isShowRenameViewDialog: !this.state.isShowRenameViewDialog });
  };

  hideRenameViewDialog = () => {
    this.setState({ isShowRenameViewDialog: false });
  };

  renderTabs = () => {
    const { settings, selectedViewIdx } = this.props;
    let tabs = [];
    if (settings) {
      const canDelete = settings.length > 1;
      tabs = settings.map((view, index) => {
        return (
          <ViewTab
            key={index}
            view={view}
            index={index}
            canDelete={canDelete}
            selectedViewIdx={selectedViewIdx}
            setViewItem={this.setViewItem}
            onSelectView={this.props.onSelectView}
            onRenameViewToggle={this.onRenameViewToggle}
            onDeleteView={this.props.onDeleteView}
            onMoveView={this.props.onMoveView}
          />
        );
      });
    }

    return tabs;
  };

  render() {
    const { isShowNewViewDialog, isShowRenameViewDialog, canScrollPrev, canScrollNext } = this.state;
    const { settings, selectedViewIdx, isMobile } = this.props;
    return (
      <div className={tabStyles['tabs-container']}>
        <div
          className={`${tabStyles['views-tabs-scroll']} d-flex pr-1`}
          ref={ref => this.viewsTabsScroll = ref}
          onScroll={this.onViewsScroll}
        >
          {this.renderTabs()}
        </div>
        {(!isMobile && (canScrollPrev || canScrollNext)) &&
          <div className={tabStyles['views-scroll-control']}>
            <span
              className={`${tabStyles['scroll-control-btn']} ${tabStyles['scroll-prev']} ${canScrollPrev && tabStyles['scroll-active']}`}
              onClick={this.onScrollWithControl.bind(this, SCROLL_TYPE.PREV)}
            >
              <i className={`dtable-font dtable-icon-left-slide ${tabStyles['btn-scroll-icon']}`} />
            </span>
            <span
              className={`${tabStyles['scroll-control-btn']} ${tabStyles['scroll-next']} ${canScrollNext && tabStyles['scroll-active']}`}
              onClick={this.onScrollWithControl.bind(this, SCROLL_TYPE.NEXT)}
            >
              <i className={`dtable-font dtable-icon-right-slide ${tabStyles['btn-scroll-icon']}`} />
            </span>
          </div>
        }
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

ViewTab.propTypes = viewTabPropTypes;
ViewTabs.propTypes = propTypes;

export default ViewTabs;
