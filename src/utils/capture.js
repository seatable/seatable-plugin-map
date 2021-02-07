import html2canvas from 'html2canvas';

const onCapture = () => {
  html2canvas(document.querySelector("#map-container"), {
    allowTaint: true,
    taintTest: true,
    useCORS: true,
    ignoreElements: (element) => {
      if (element.className === 'leaflet-top leaflet-left') {
        return true;
      }
    }
  }).then(canvas => {
    const captureContainer = document.createElement('div');
    captureContainer.className = 'map-capture';
    const downLoadLink = document.createElement('a');
    downLoadLink.className = 'download-link';
    captureContainer.appendChild(downLoadLink);
    captureContainer.appendChild(canvas);
    document.querySelector('#map-container').appendChild(captureContainer);

    document.querySelector('.map-capture').appendChild(canvas);
    const src = canvas.toDataURL("image/png", 1);
    const link = document.querySelector('.download-link');
    link.href = src;
    link.download = 'map.png';
    link.click();
    document.querySelector('.map-capture').remove();
  });
}

export default onCapture;