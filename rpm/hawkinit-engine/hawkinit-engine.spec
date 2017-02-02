%define _version 1.3.2
%define _release 1


Name:    hawkinit-engine
Version: %{_version}
Release: %{_release}%{?dist}
Summary: Hawkinit CLI Tool
Group: Development/Tools
URL: https://github.com/Jiri-Kremser/hawkinit
License: ASL 2.0
Source0: %{name}-1.3.2.tar.gz
Packager: Jiri Kremser <jkremser(at)redhat.com>
Requires: docker-engine >= 1.12.0, docker-compose, nodejs >= 4.3.2
Conflicts: hawkinit, docker
BuildArch: noarch
AutoReq: no
AutoProv: no

%description
CLI tool that sets up the Hawkular Services together with couple of servers to monitor. This version is meant to be used together with the docker-engine package.

%prep
%autosetup -n %{name}

%build
#noop

%install
mkdir -p %{buildroot}/usr/lib/node_modules/hawkinit
mkdir -p %{buildroot}/%{_bindir}
cp -prf * %{buildroot}/usr/lib/node_modules/hawkinit
ln -s /usr/lib/node_modules/hawkinit/index.js %{buildroot}/%{_bindir}/hawkinit

%files
/usr/lib/node_modules/hawkinit
%{_bindir}/hawkinit

%changelog
* Mon Jan 16 2017 Jiri Kremser <jkremser at redhat.com> - 1.3.2-1
- Initial rpm packaging
