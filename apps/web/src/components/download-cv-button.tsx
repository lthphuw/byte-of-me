'use client';

import { Button } from './ui/button';

export function DownloadCVButton() {
  const handleDownload = () => {
    window.open(`/api/me/cv/pdf`, '_blank');
  };

  return (
    <Button variant={'default'} onClick={handleDownload} className="">
      Download
    </Button>
  );
}
