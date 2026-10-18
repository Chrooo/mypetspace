import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Avatar.css';

// the picture shown when the customer has not uploaded one yet
function DefaultAvatar() {
  return (
    <span className="cd-avatar-default" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <g fill="#fff">
          <circle cx="42" cy="24" r="8" />
          <circle cx="52" cy="19" r="10" />
          <circle cx="61" cy="25" r="7" />
          <rect x="34" y="24" width="35" height="8" rx="4" />
        </g>
        <path d="M0 66 C 15 62, 40 70, 70 82 L 70 100 L 0 100 Z" fill="#c8e283" />
        <path d="M8 100 C 14 90, 32 78, 54 77 C 74 76, 88 84, 96 100 Z" fill="#8ba300" />
      </svg>
    </span>
  );
}

// fills its round box: the customer's photo, or the default picture
export function AvatarImage({ src, alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]); // try again when the photo changes
  if (src && !failed) {
    return <img src={src} alt={alt} className="cd-avatar-img" onError={() => setFailed(true)} />;
  }
  return <DefaultAvatar />;
}

// the small round picture at the top right of the customer pages (opens My Profile)
export function HeaderAvatar({ user, to = '/account/profile' }) {
  const image = <AvatarImage src={user?.avatar} />;
  if (!to) return <span className="cd-avatar">{image}</span>;
  return (
    <Link to={to} className="cd-avatar" aria-label="My profile">
      {image}
    </Link>
  );
}